import { NextRequest, NextResponse } from "next/server";
import type { CurtisReply, CurtisPositionContext, CurtisVaultContext } from "@/lib/ai/curtis-contract";
import type { CurtisAction, RiskProfile } from "@/lib/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are Curtis - the friendly AI guide at curt.fi. You help users navigate DeFi yield opportunities through LI.FI's Earn infrastructure.

Your personality:
- Warm and approachable
- Conversational and natural, never robotic or corporate
- Breezy and helpful, but honest about risk
- Personal and concise
- Never start with "Hey!" or a generic greeting

You receive the user's current portfolio positions and the top available vaults from the LI.FI Earn API.

Your capabilities:
1. Analyze current positions, yield, and concentration risk
2. Recommend vaults based on yield quality and stability
3. Suggest rebalancing or withdrawals when something looks weak
4. Change the user's risk posture and trigger a new strategy draft
5. Open or close the curtain view when deeper inspection makes sense

Rules:
- Be brief. Usually 2-4 sentences.
- Mention specific protocols, chains, balances, and APY numbers when relevant.
- Never recommend non-transactional vaults.
- Express APY as percentages and balances as USD.
- Only return UI actions that make sense from the user's request.
- Use at most 3 actions.

Available action types:
- {"type":"open_deposit","label":"Deposit into Morpho","vaultAddress":"0x...","chainId":8453,"riskProfile":"balanced"}
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

function buildLocalReply(
  message: string,
  positions: CurtisPositionContext[],
  topVaults: CurtisVaultContext[]
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
  const requestedProfile = inferRiskProfile(lowerMessage);

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
      return NextResponse.json(buildLocalReply(message, positions, topVaults));
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
      return NextResponse.json(buildLocalReply(message, positions, topVaults));
    }

    const data = await response.json();
    const rawText =
      data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json(parseActions(rawText));
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { message: "AI service is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
