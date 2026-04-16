import { NextRequest, NextResponse } from "next/server";
import type { CurtisReply, CurtisPositionContext, CurtisVaultContext } from "@/lib/ai/curtis-contract";
import type { CurtisAction, RiskProfile } from "@/lib/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are Curtis - the allocation operator at curt.fi. You help users navigate DeFi yield opportunities through LI.FI's Earn infrastructure.

Your personality:
- Clear, calm, and practical
- Confident without sounding stiff
- Human and concise, not robotic or theatrical
- Never cute, gushy, salesy, or overly formal
- Never start with filler greetings or empty enthusiasm

You receive the user's current portfolio positions and the top available vaults from the LI.FI Earn API.

Your capabilities:
1. Analyze current positions, yield, and concentration risk
2. Recommend vaults based on yield quality, stability, and fit for the user's goal
3. Ask smart follow-up questions before recommending a pool when the brief is incomplete
4. Suggest rebalancing or withdrawals when something looks weak
5. Change the user's risk posture and trigger a new strategy draft
6. Prepare the deposit path so the UI can quote it and move straight to wallet approval

Conversation workflow:
- If a deposit request is vague, ask 2-4 short follow-up questions before recommending anything.
- Usually learn the rough amount, token preference, stable vs higher-yield posture, and time horizon or liquidity needs.
- Once you have enough context, recommend one strongest-fit vault and explain why it fits.
- If the user says proceed, move forward, prepare it, or approve, return an open_deposit action with any known amount, tokenSymbol, fromChainId, riskProfile, autoQuote:true, and autoSubmit:true.

Rules:
- Be brief. Usually 2-4 sentences.
- Ask only the minimum follow-up questions needed to make a good recommendation.
- Use short paragraphs with line breaks. When comparing options or asking several questions, use bullets on separate lines starting with '-'.
- Do not use markdown styling like backticks, bold markers, or inline '*' bullets.
- Mention specific protocols, chains, balances, and APY numbers when relevant.
- Never recommend non-transactional vaults.
- Express APY as percentages and balances as USD.
- Keep the tone balanced: not too soft, not too strict.
- Only return UI actions that make sense from the user's request.
- Use at most 3 actions.

Available action types:
- {"type":"open_deposit","label":"Prepare USDC deposit","vaultAddress":"0x...","chainId":8453,"riskProfile":"balanced","amount":"2500","tokenSymbol":"USDC","fromChainId":8453,"autoQuote":true,"autoSubmit":true,"intentNote":"Long-term stable allocation"}
- {"type":"open_withdraw","label":"Withdraw from Aave","vaultAddress":"0x...","chainId":42161}
- {"type":"set_risk_profile","label":"Switch to safe mode","riskProfile":"safe"}
- {"type":"generate_strategy","label":"Generate safe strategy","riskProfile":"safe"}
- {"type":"toggle_curtain","label":"Open curtain view","open":true}

If you want to return actions, append one line at the very end in this exact format:
ACTIONS:[{"type":"...","label":"..."}]

Do not wrap the whole response in JSON. Only append the ACTIONS line when it adds clear value.`;

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatApy(value: number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : `${value.toFixed(2)}%`;
}

function isRiskProfile(value: unknown): value is RiskProfile {
  return value === "safe" || value === "balanced" || value === "aggressive";
}

function normalizeAction(raw: unknown): CurtisAction | null {
  if (!raw || typeof raw !== "object") return null;

  const action = raw as Record<string, unknown>;
  const type = action.type;
  const label = action.label;

  if (typeof type !== "string" || typeof label !== "string") {
    return null;
  }

  switch (type) {
    case "open_deposit":
      return {
        type,
        label,
        vaultAddress:
          typeof action.vaultAddress === "string" ? action.vaultAddress : undefined,
        chainId: typeof action.chainId === "number" ? action.chainId : undefined,
        riskProfile: isRiskProfile(action.riskProfile)
          ? action.riskProfile
          : undefined,
        amount: typeof action.amount === "string" ? action.amount : undefined,
        tokenSymbol:
          typeof action.tokenSymbol === "string" ? action.tokenSymbol.toUpperCase() : undefined,
        fromChainId:
          typeof action.fromChainId === "number" ? action.fromChainId : undefined,
        autoQuote:
          typeof action.autoQuote === "boolean" ? action.autoQuote : undefined,
        autoSubmit:
          typeof action.autoSubmit === "boolean" ? action.autoSubmit : undefined,
        intentNote:
          typeof action.intentNote === "string" ? action.intentNote : undefined,
      };

    case "open_withdraw":
      return {
        type,
        label,
        vaultAddress:
          typeof action.vaultAddress === "string" ? action.vaultAddress : undefined,
        chainId: typeof action.chainId === "number" ? action.chainId : undefined,
      };

    case "set_risk_profile":
      if (!isRiskProfile(action.riskProfile)) return null;
      return {
        type,
        label,
        riskProfile: action.riskProfile,
      };

    case "generate_strategy":
      return {
        type,
        label,
        riskProfile: isRiskProfile(action.riskProfile)
          ? action.riskProfile
          : undefined,
      };

    case "toggle_curtain":
      return {
        type,
        label,
        open: typeof action.open === "boolean" ? action.open : undefined,
      };

    default:
      return null;
  }
}

function parseActions(rawText: string): CurtisReply {
  const actionsMatch = rawText.match(/(?:^|\n)ACTIONS:(\[[\s\S]*\])\s*$/);
  const legacyActionMatch = rawText.match(/(?:^|\n)ACTION:(\{[\s\S]*\})\s*$/);

  if (actionsMatch) {
    try {
      const parsed = JSON.parse(actionsMatch[1]) as unknown[];
      const actions = parsed
        .map((item) => normalizeAction(item))
        .filter((item): item is CurtisAction => item !== null);

      return {
        message: rawText.replace(/\n?ACTIONS:\[[\s\S]*\]\s*$/, "").trim(),
        actions: actions.length > 0 ? actions : undefined,
      };
    } catch {
      return { message: rawText.trim() };
    }
  }

  if (legacyActionMatch) {
    try {
      const action = normalizeAction({
        type: "open_deposit",
        ...(JSON.parse(legacyActionMatch[1]) as Record<string, unknown>),
      });

      return {
        message: rawText.replace(/\n?ACTION:\{[\s\S]*\}\s*$/, "").trim(),
        actions: action ? [action] : undefined,
      };
    } catch {
      return { message: rawText.trim() };
    }
  }

  return { message: rawText.trim() };
}

function pickTopVault(
  vaults: CurtisVaultContext[],
  predicate?: (vault: CurtisVaultContext) => boolean
) {
  return vaults
    .filter((vault) => (predicate ? predicate(vault) : true))
    .sort((a, b) => toNumber(b.apy) - toNumber(a.apy))[0];
}

function pickWeakestPosition(positions: CurtisPositionContext[]) {
  return [...positions].sort((a, b) => {
    const aTrend = toNumber(a.apy7d, toNumber(a.apy)) - toNumber(a.apy30d, toNumber(a.apy));
    const bTrend = toNumber(b.apy7d, toNumber(b.apy)) - toNumber(b.apy30d, toNumber(b.apy));
    if (aTrend !== bTrend) return aTrend - bTrend;
    return toNumber(b.balanceUsd) - toNumber(a.balanceUsd);
  })[0];
}

function inferRiskProfile(lowerMessage: string): RiskProfile | undefined {
  if (
    lowerMessage.includes("safe") ||
    lowerMessage.includes("conservative") ||
    lowerMessage.includes("safer")
  ) {
    return "safe";
  }

  if (lowerMessage.includes("balanced")) {
    return "balanced";
  }

  if (
    lowerMessage.includes("aggressive") ||
    lowerMessage.includes("higher yield") ||
    lowerMessage.includes("more yield")
  ) {
    return "aggressive";
  }

  return undefined;
}

interface DepositConversationSignals {
  amount?: string;
  tokenSymbol?: string;
  fromChainId?: number;
  riskProfile?: RiskProfile;
  wantsStable: boolean;
  wantsLongTerm: boolean;
  needsLiquidity: boolean;
  askedForDeposit: boolean;
  wantsQuote: boolean;
  wantsProceed: boolean;
}

function buildIntentNote(signals: DepositConversationSignals): string | undefined {
  if (!signals.amount && !signals.tokenSymbol && !signals.riskProfile) {
    return undefined;
  }

  const amountLabel = `${signals.amount ?? "Planned"}${
    signals.tokenSymbol ? ` ${signals.tokenSymbol}` : ""
  }`;

  return [
    `${amountLabel} deposit`,
    signals.wantsStable || signals.riskProfile === "safe"
      ? "stable-focused"
      : signals.riskProfile === "aggressive"
        ? "higher-yield"
        : signals.riskProfile === "balanced"
          ? "balanced"
          : null,
    signals.wantsLongTerm
      ? "longer-term"
      : signals.needsLiquidity
        ? "liquid"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function extractAmount(text: string): string | undefined {
  const matches = text.matchAll(
    /(?:\$\s*|about\s+|around\s+|roughly\s+|approx(?:imately)?\s+|like\s+)?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\s*(usdc|usdt|dai|eth|pol)?\b/gi
  );

  for (const match of matches) {
    const rawValue = match[1]?.replaceAll(",", "");
    const unit = match[2]?.toLowerCase();
    const token = match[3];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) continue;
    if (!token && !match[0].includes("$") && numericValue < 50) continue;

    let normalizedValue = numericValue;
    if (unit === "k") normalizedValue *= 1_000;
    if (unit === "m") normalizedValue *= 1_000_000;

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: normalizedValue >= 1000 ? 0 : 2,
    }).format(normalizedValue);
  }

  return undefined;
}

function extractTokenSymbol(lowerText: string): string | undefined {
  if (lowerText.includes("usdc")) return "USDC";
  if (lowerText.includes("usdt")) return "USDT";
  if (lowerText.includes("dai")) return "DAI";
  if (lowerText.includes("eth") || lowerText.includes("weth")) return "ETH";
  if (lowerText.includes("pol") || lowerText.includes("matic")) return "POL";
  return undefined;
}

function inferSourceChainId(lowerText: string): number | undefined {
  if (lowerText.includes("base")) return 8453;
  if (lowerText.includes("arbitrum")) return 42161;
  if (lowerText.includes("optimism")) return 10;
  if (lowerText.includes("polygon")) return 137;
  if (lowerText.includes("ethereum") || lowerText.includes("mainnet")) return 1;
  return undefined;
}

function collectDepositSignals(
  message: string,
  chatHistory: Array<{ role: string; content: string }>
): DepositConversationSignals {
  const userConversation = [...chatHistory, { role: "user", content: message }]
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content)
    .join("\n");
  const lowerConversation = userConversation.toLowerCase();
  const lowerMessage = message.toLowerCase();

  return {
    amount: extractAmount(userConversation),
    tokenSymbol: extractTokenSymbol(lowerConversation),
    fromChainId: inferSourceChainId(lowerConversation),
    riskProfile:
      inferRiskProfile(lowerConversation) ??
      (/stable|stablecoin|stables|savings|capital preserv/.test(lowerConversation)
        ? "safe"
        : undefined),
    wantsStable: /stable|stablecoin|stables|savings|capital preserv/.test(
      lowerConversation
    ),
    wantsLongTerm: /long term|long-term|park|months|hold/.test(lowerConversation),
    needsLiquidity: /liquid|liquidity|flexible|anytime|easy access/.test(
      lowerConversation
    ),
    askedForDeposit: /deposit|pool|vault|park|allocate|put .* work|fresh capital|start/.test(
      lowerConversation
    ),
    wantsQuote: /quote|prepare|route|transaction/.test(lowerMessage),
    wantsProceed: /proceed|go ahead|let'?s do it|do it|move forward|approve|sign|yes\b/.test(
      lowerMessage
    ),
  };
}

function enrichReply(
  reply: CurtisReply,
  message: string,
  chatHistory: Array<{ role: string; content: string }>,
  topVaults: CurtisVaultContext[]
): CurtisReply {
  const signals = collectDepositSignals(message, chatHistory);
  const preferredVault =
    signals.wantsStable || signals.riskProfile === "safe"
      ? pickTopVault(topVaults, (vault) =>
          vault.tags.some((tag) => tag.toLowerCase() === "stablecoin")
        ) ?? pickTopVault(topVaults)
      : pickTopVault(topVaults);

  const mappedActions = (reply.actions ?? []).map((action) => {
    if (action.type !== "open_deposit") return action;

    return {
      ...action,
      vaultAddress: action.vaultAddress ?? preferredVault?.address,
      chainId: action.chainId ?? preferredVault?.chainId,
      riskProfile:
        action.riskProfile ??
        signals.riskProfile ??
        (signals.wantsStable ? "safe" : undefined),
      amount: action.amount ?? signals.amount,
      tokenSymbol: action.tokenSymbol ?? signals.tokenSymbol,
      fromChainId: action.fromChainId ?? signals.fromChainId,
      autoQuote:
        action.autoQuote ??
        (signals.wantsProceed || signals.wantsQuote ? true : undefined),
      autoSubmit:
        action.autoSubmit ?? (signals.wantsProceed ? true : undefined),
      intentNote: action.intentNote ?? buildIntentNote(signals),
    };
  });

  const hasDepositAction = mappedActions.some(
    (action) => action.type === "open_deposit"
  );

  if (
    !hasDepositAction &&
    preferredVault &&
    (signals.wantsProceed || signals.wantsQuote || (signals.askedForDeposit && signals.amount))
  ) {
    mappedActions.push({
      type: "open_deposit",
      label: signals.wantsProceed || signals.wantsQuote
        ? `Prepare ${preferredVault.protocol} deposit`
        : `Review ${preferredVault.protocol} deposit`,
      vaultAddress: preferredVault.address,
      chainId: preferredVault.chainId,
      riskProfile: signals.riskProfile ?? (signals.wantsStable ? "safe" : "balanced"),
      amount: signals.amount,
      tokenSymbol: signals.tokenSymbol,
      fromChainId: signals.fromChainId,
      autoQuote: signals.wantsProceed || signals.wantsQuote ? true : undefined,
      autoSubmit: signals.wantsProceed ? true : undefined,
      intentNote: buildIntentNote(signals),
    });
  }

  return {
    ...reply,
    actions: mappedActions.length > 0 ? mappedActions : undefined,
  };
}

function buildLocalReply(
  message: string,
  positions: CurtisPositionContext[],
  topVaults: CurtisVaultContext[],
  chatHistory: Array<{ role: string; content: string }> = []
): CurtisReply {
  const lowerMessage = message.toLowerCase();
  const largestPosition = [...positions].sort(
    (a, b) => toNumber(b.balanceUsd) - toNumber(a.balanceUsd)
  )[0];
  const weakestPosition = pickWeakestPosition(positions);
  const bestVault = pickTopVault(topVaults);
  const bestStableVault = pickTopVault(topVaults, (vault) =>
    vault.tags.some((tag) => tag.toLowerCase() === "stablecoin")
  );
  const depositSignals = collectDepositSignals(message, chatHistory);
  const requestedProfile = depositSignals.riskProfile ?? inferRiskProfile(lowerMessage);

  if (lowerMessage.includes("open the curtain") || lowerMessage.includes("show the curtain")) {
    return {
      message:
        "I can open the full curtain view so you can inspect chain spread, protocol exposure, and the reasoning behind each move.",
      actions: [
        {
          type: "toggle_curtain",
          label: "Open curtain view",
          open: true,
        },
      ],
    };
  }

  if (
    lowerMessage.includes("close the curtain") ||
    lowerMessage.includes("hide the curtain") ||
    lowerMessage.includes("banking view")
  ) {
    return {
      message:
        "I can tuck the technical layer away and bring you back to the calmer banking surface.",
      actions: [
        {
          type: "toggle_curtain",
          label: "Return to banking view",
          open: false,
        },
      ],
    };
  }

  if (depositSignals.askedForDeposit || depositSignals.wantsProceed || depositSignals.wantsQuote) {
    const candidate =
      depositSignals.wantsStable || requestedProfile === "safe"
        ? bestStableVault ?? bestVault
        : bestVault ?? bestStableVault;

    if (!depositSignals.amount && !requestedProfile && !depositSignals.wantsStable) {
      return {
        message:
          "Give me the rough amount, whether you want stable or higher-yield exposure, and whether this needs to stay liquid. Then I'll narrow it down.",
      };
    }

    if (!depositSignals.amount) {
      return {
        message: `I have the posture. Send the rough amount${
          depositSignals.tokenSymbol ? ` in ${depositSignals.tokenSymbol}` : ""
        } and I'll narrow it to the best live pool and prepare the route.`,
      };
    }

    if (!candidate) {
      return {
        message:
          "I couldn't pull a clean live ranking of vaults just yet. Try again in a moment and I'll line up the best route.",
      };
    }

    const amountLabel = `${depositSignals.amount}${
      depositSignals.tokenSymbol ? ` ${depositSignals.tokenSymbol}` : ""
    }`;
    const intentNote = buildIntentNote({
      ...depositSignals,
      riskProfile: requestedProfile,
    });

    return {
      message: `For ${amountLabel}, I'd use ${candidate.protocol} on ${candidate.chain} for ${candidate.tokens.join(
        "/"
      )} at ${formatApy(candidate.apy)}.

Why it fits:
- ${
        depositSignals.wantsStable || requestedProfile === "safe"
          ? "stable, lower-volatility exposure"
          : requestedProfile === "aggressive"
            ? "better yield with more risk"
            : "a balanced risk and yield tradeoff"
      }
- ${
        depositSignals.wantsLongTerm
          ? "works for longer-term parking"
          : depositSignals.needsLiquidity
            ? "keeps the move more flexible"
            : "fits general savings capital"
      }

${
        depositSignals.wantsProceed || depositSignals.wantsQuote
          ? "I can prepare the route now."
          : "If you want, I can prepare the deposit route next."
      }`,
      actions: [
        {
          type: "open_deposit",
          label:
            depositSignals.wantsProceed || depositSignals.wantsQuote
              ? `Prepare ${candidate.protocol} deposit`
              : `Review ${candidate.protocol} deposit`,
          vaultAddress: candidate.address,
          chainId: candidate.chainId,
          riskProfile:
            requestedProfile ??
            (candidate === bestStableVault ? "safe" : "balanced"),
          amount: depositSignals.amount,
          tokenSymbol: depositSignals.tokenSymbol,
          fromChainId: depositSignals.fromChainId,
          autoQuote: depositSignals.wantsProceed || depositSignals.wantsQuote,
          autoSubmit: depositSignals.wantsProceed,
          intentNote,
        },
        {
          type: "generate_strategy",
          label: requestedProfile
            ? `Compare ${requestedProfile} plan`
            : "Compare with AI strategy",
          riskProfile: requestedProfile,
        },
      ],
    };
  }

  if (
    lowerMessage.includes("rebalance") ||
    lowerMessage.includes("strategy") ||
    lowerMessage.includes("allocation plan")
  ) {
    return {
      message: requestedProfile
        ? `I'd refresh the strategy in ${requestedProfile} mode so the next plan matches the posture you asked for.`
        : "I can draft a fresh strategy from the live vault set and your current positions.",
      actions: [
        ...(requestedProfile
          ? [
              {
                type: "set_risk_profile" as const,
                label: `Set ${requestedProfile} profile`,
                riskProfile: requestedProfile,
              },
            ]
          : []),
        {
          type: "generate_strategy" as const,
          label: requestedProfile
            ? `Generate ${requestedProfile} strategy`
            : "Generate new strategy",
          riskProfile: requestedProfile,
        },
      ],
    };
  }

  if (
    lowerMessage.includes("withdraw") ||
    lowerMessage.includes("exit") ||
    lowerMessage.includes("unwind") ||
    lowerMessage.includes("cash out")
  ) {
    if (!largestPosition) {
      return {
        message:
          "You don't have any live positions to unwind yet, so there's nothing for me to route into the withdrawal flow.",
      };
    }

    return {
      message: `If you want to unwind capital, I'd start with ${largestPosition.protocol} on ${largestPosition.chain} since it holds ${formatUsd(
        toNumber(largestPosition.balanceUsd)
      )} right now.`,
      actions: [
        {
          type: "open_withdraw",
          label: `Withdraw from ${largestPosition.protocol}`,
          vaultAddress: largestPosition.address,
          chainId: largestPosition.chainId,
        } as CurtisAction,
      ],
    };
  }

  if (
    lowerMessage.includes("risk") ||
    lowerMessage.includes("concentrat") ||
    lowerMessage.includes("riskiest")
  ) {
    if (!largestPosition) {
      return {
        message:
          "Your portfolio is empty right now, so there isn't any concentration risk to flag yet.",
      };
    }

    const apy7d = toNumber(largestPosition.apy7d, toNumber(largestPosition.apy));
    const apy30d = toNumber(largestPosition.apy30d, apy7d);
    const trend = apy7d - apy30d;

    return {
      message: `${largestPosition.protocol} on ${largestPosition.chain} is your biggest position at ${formatUsd(
        toNumber(largestPosition.balanceUsd)
      )}. It's yielding ${formatApy(largestPosition.apy)} right now, and ${
        trend < -0.2
          ? `heads up - that yield has slipped ${Math.abs(trend).toFixed(2)}% versus the 30d trend.`
          : "the yield trend still looks fairly steady."
      }`,
      actions: weakestPosition
        ? [
            {
              type: "open_withdraw",
              label: `Review ${weakestPosition.protocol} exit`,
              vaultAddress: weakestPosition.address,
              chainId: weakestPosition.chainId,
            } as CurtisAction,
            {
              type: "generate_strategy",
              label: "Draft a safer rebalance",
              riskProfile: "safe",
            },
          ]
        : undefined,
    };
  }

  if (positions.length === 0) {
    const starterVault =
      lowerMessage.includes("stable") || lowerMessage.includes("safe")
        ? bestStableVault ?? bestVault
        : bestVault ?? bestStableVault;

    if (!starterVault) {
      return {
        message:
          "I couldn't find any live vault data right now. Give me another shot in a moment and I'll scan the market again.",
      };
    }

    return {
      message: `I'd start with ${starterVault.protocol} on ${starterVault.chain} for ${starterVault.tokens.join(
        "/"
      )} at ${formatApy(
        starterVault.apy
      )}. It's a clean first position and gives you a tighter starting point than spraying into random vaults.`,
      actions: [
        ...(requestedProfile
          ? [
              {
                type: "set_risk_profile" as const,
                label: `Set ${requestedProfile} profile`,
                riskProfile: requestedProfile,
              },
            ]
          : []),
        {
          type: "open_deposit",
          label: `Open ${starterVault.protocol} deposit`,
          vaultAddress: starterVault.address,
          chainId: starterVault.chainId,
          riskProfile:
            requestedProfile ??
            (starterVault === bestStableVault ? "safe" : "balanced"),
        },
      ],
    };
  }

  if (
    lowerMessage.includes("better") ||
    lowerMessage.includes("best") ||
    lowerMessage.includes("start") ||
    lowerMessage.includes("yield")
  ) {
    const candidate =
      lowerMessage.includes("stable") || lowerMessage.includes("safe")
        ? bestStableVault ?? bestVault
        : bestVault ?? bestStableVault;

    if (!candidate) {
      return {
        message:
          "I couldn't rank the live vaults yet because the feed hasn't come back cleanly. Try again in a moment.",
      };
    }

    return {
      message: `My strongest live pick right now is ${candidate.protocol} on ${candidate.chain} for ${candidate.tokens.join(
        "/"
      )} at ${formatApy(candidate.apy)}. ${
        toNumber(candidate.apy7d) > toNumber(candidate.apy30d)
          ? "Yield momentum is moving the right way too."
          : "The rate looks good, but I'd still keep an eye on momentum."
      }`,
      actions: [
        {
          type: "open_deposit",
          label: `Open ${candidate.protocol} deposit`,
          vaultAddress: candidate.address,
          chainId: candidate.chainId,
          riskProfile:
            requestedProfile ??
            (candidate === bestStableVault ? "safe" : undefined),
        },
        {
          type: "generate_strategy",
          label: requestedProfile
            ? `Generate ${requestedProfile} strategy`
            : "Compare with AI strategy",
          riskProfile: requestedProfile,
        },
      ],
    };
  }

  if (requestedProfile) {
    return {
      message: `I can shift the whole interface into a ${requestedProfile} posture and refresh the strategy from there.`,
      actions: [
        {
          type: "set_risk_profile",
          label: `Set ${requestedProfile} profile`,
          riskProfile: requestedProfile,
        },
        {
          type: "generate_strategy",
          label: `Generate ${requestedProfile} strategy`,
          riskProfile: requestedProfile,
        },
      ],
    };
  }

  const totalBalance = positions.reduce(
    (sum, position) => sum + toNumber(position.balanceUsd),
    0
  );
  const blendedApy =
    totalBalance > 0
      ? positions.reduce((sum, position) => {
          const weight = toNumber(position.balanceUsd) / totalBalance;
          return sum + toNumber(position.apy) * weight;
        }, 0)
      : 0;

  return {
    message: `You're sitting on ${formatUsd(totalBalance)} across ${
      positions.length
    } live position${positions.length === 1 ? "" : "s"}, with a blended yield around ${formatApy(
      blendedApy
    )}. I can open the curtain, tune your risk profile, or draft a fresh strategy from here.`,
    actions: [
      {
        type: "generate_strategy",
        label: "Generate new strategy",
      },
      {
        type: "toggle_curtain",
        label: "Open curtain view",
        open: true,
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, positions = [], topVaults = [], chatHistory = [] } =
      (await req.json()) as {
        message: string;
        positions?: CurtisPositionContext[];
        topVaults?: CurtisVaultContext[];
        chatHistory?: Array<{ role: string; content: string }>;
      };

    const contextBlock = `
CURRENT PORTFOLIO:
${
  positions.length > 0
    ? positions
        .map(
          (position) =>
            `- ${position.protocol} ${position.tokens.join("/")} on ${position.chain}: $${position.balanceUsd} | APY: ${position.apy}% | 7d: ${position.apy7d ?? "n/a"}% | 30d: ${position.apy30d ?? "n/a"}% | TVL: $${position.tvlUsd ?? "n/a"}`
        )
        .join("\n")
    : "No active positions."
}

TOP AVAILABLE VAULTS:
${
  topVaults.length > 0
    ? topVaults
        .map(
          (vault) =>
            `- ${vault.protocol} ${vault.tokens.join("/")} on ${vault.chain} (${vault.address}): APY ${vault.apy}% | 7d: ${vault.apy7d ?? "n/a"}% | 30d: ${vault.apy30d ?? "n/a"}% | TVL: $${vault.tvlUsd ?? "n/a"} | Tags: ${vault.tags.join(", ")}`
        )
        .join("\n")
    : "No vault data available."
}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        buildLocalReply(message, positions, topVaults, chatHistory)
      );
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://curt.fi",
        "X-Title": "curt.fi",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...chatHistory.map((chatMessage) => ({
            role: chatMessage.role as "user" | "assistant",
            content: chatMessage.content,
          })),
          {
            role: "user",
            content: `${contextBlock}\n\nUser question: ${message}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        buildLocalReply(message, positions, topVaults, chatHistory)
      );
    }

    const data = await response.json();
    const rawText =
      data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json(
      enrichReply(parseActions(rawText), message, chatHistory, topVaults)
    );
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { message: "AI service is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
