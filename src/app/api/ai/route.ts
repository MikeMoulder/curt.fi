import { NextRequest, NextResponse } from "next/server";
import type { CurtisReply, CurtisPositionContext, CurtisVaultContext } from "@/lib/ai/curtis-contract";
import type { CurtisAction, RiskProfile, VaultComparisonItem } from "@/lib/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are Curtis — the allocation operator at curt.fi. You help users navigate DeFi yield opportunities through LI.FI's Earn infrastructure.

Your personality:
- Clear, calm, and practical
- Confident without sounding stiff
- Human and concise, not robotic or theatrical
- Never cute, gushy, salesy, or overly formal
- Never start with filler greetings or empty enthusiasm

You receive the user's current portfolio positions, the top available vaults, and a structured CONVERSATION STATE that tracks what you've gathered so far.

## Agentic conversation protocol

You operate in three phases. Follow them in order.

### Phase 1 — Gather (ask smart follow-ups)
When a user mentions depositing, finding a pool, or allocating capital, assess what you already know from the CONVERSATION STATE. Ask only about what's MISSING, 1-2 questions at a time. The key fields to gather:

1. Rough amount (e.g. "$2k", "about 5,000 USDC")
2. Token preference — stables (USDC/USDT/DAI) or volatile (ETH, etc.)
3. Risk posture — safe/balanced/aggressive, or "savings" vs "higher yield"
4. Time horizon — parking for months or needs flexible access
5. Chain preference — Base, Arbitrum, Optimism, Polygon, Ethereum, or no preference

If the user gives several pieces of info at once, acknowledge what you captured and only ask about what's still missing. Never repeat questions they already answered.

If the user's message already contains enough context (amount + risk posture at minimum), skip directly to Phase 2.

### Phase 2 — Recommend (present best-fit options)
Once you have enough context (at minimum: amount and risk posture), recommend the single strongest-fit vault from the available data. Explain WHY it fits in 2-3 bullets:
- APY and yield trend (climbing, stable, or declining)
- TVL depth and protocol trust
- How it matches their stated goals

If two vaults are genuinely close, present both with tradeoffs using a compare_vaults action. Never list more than 3 options — decisiveness is more valuable than exhaustiveness.

End with a clear call to action: "Want me to prepare the route?" or "Say proceed and I'll set it up."

### Phase 3 — Execute (prepare the transaction)
When the user says proceed, go ahead, do it, let's go, approve, or similar confirmation:
- Return an open_deposit action with ALL known fields populated
- Set autoQuote:true and autoSubmit:true so the UI fetches the quote and triggers the wallet popup automatically
- The user just needs to sign in their wallet

## Action format

Available action types and their JSON shapes:
- {"type":"open_deposit","label":"Prepare deposit","vaultAddress":"0x...","chainId":8453,"riskProfile":"balanced","amount":"2500","tokenSymbol":"USDC","fromChainId":8453,"autoQuote":true,"autoSubmit":true,"intentNote":"Long-term stable allocation"}
- {"type":"open_withdraw","label":"Withdraw from Aave","vaultAddress":"0x...","chainId":42161}
- {"type":"set_risk_profile","label":"Switch to safe mode","riskProfile":"safe"}
- {"type":"generate_strategy","label":"Generate safe strategy","riskProfile":"safe"}
- {"type":"toggle_curtain","label":"Open curtain view","open":true}
- {"type":"compare_vaults","label":"Compare top options","vaults":[{"vaultAddress":"0x...","chainId":8453,"protocol":"Aave","chain":"Base","tokens":["USDC"],"apy":4.2,"apy7d":4.3,"apy30d":4.0,"tvlUsd":"180000000","recommended":true,"reasoning":"Best fit for your goals"},{"vaultAddress":"0x...","chainId":42161,"protocol":"Compound","chain":"Arbitrum","tokens":["USDC"],"apy":3.8,"tvlUsd":"95000000","reasoning":"Lower yield but deeper liquidity"}]}
- {"type":"show_position_analysis","label":"Analyze position","vaultAddress":"0x...","chainId":42161}

If you want to return actions, append one line at the very end in this exact format:
ACTIONS:[{"type":"...","label":"..."}]

Do not wrap the whole response in JSON. Only append the ACTIONS line when it adds clear value.

## Rules
- Be brief. Usually 2-4 sentences per turn.
- Ask only the minimum follow-up questions needed
- Use short paragraphs with line breaks. Use bullets starting with '-' for lists.
- Do not use markdown styling like backticks, bold markers, or inline '*' bullets.
- Mention specific protocols, chains, balances, and APY numbers when relevant — be concrete, not abstract.
- Never recommend non-transactional vaults.
- Express APY as percentages and balances as USD.
- Use at most 3 actions per response.
- When comparing vaults, use the compare_vaults action type so the UI renders a comparison card.
- When the conversation state shows most fields are filled, lean toward recommending rather than asking more questions.`;

// ── Helpers ──

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

// ── Conversation State Tracking ──

interface ConversationState {
  intent: "deposit" | "withdraw" | "rebalance" | "info" | "unknown";
  amount?: string;
  tokenSymbol?: string;
  fromChainId?: number;
  riskProfile?: RiskProfile;
  wantsStable: boolean;
  wantsLongTerm: boolean;
  needsLiquidity: boolean;
  wantsProceed: boolean;
  wantsQuote: boolean;
  wantsComparison: boolean;
  missingFields: string[];
  phase: "gathering" | "recommending" | "executing";
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

function inferRiskProfile(lowerMessage: string): RiskProfile | undefined {
  if (/safe|conservative|safer|savings|capital preserv|low risk|stablecoin|stables/.test(lowerMessage)) return "safe";
  if (/balanced/.test(lowerMessage)) return "balanced";
  if (/aggressive|higher yield|more yield|degen|max yield|risky/.test(lowerMessage)) return "aggressive";
  return undefined;
}

function detectIntent(lowerText: string): ConversationState["intent"] {
  if (/deposit|pool|vault|park|allocate|put .* work|fresh capital|start|invest|earn|yield|where should|savings/.test(lowerText)) return "deposit";
  if (/withdraw|exit|unwind|cash out|pull out|redeem/.test(lowerText)) return "withdraw";
  if (/rebalance|strategy|allocation plan|optimize|shift|reallocat/.test(lowerText)) return "rebalance";
  if (/risk|concentrat|explain|show|what|how|why|status|portfolio|position/.test(lowerText)) return "info";
  return "unknown";
}

function buildConversationState(
  message: string,
  chatHistory: Array<{ role: string; content: string }>
): ConversationState {
  const allUserText = [...chatHistory, { role: "user", content: message }]
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content)
    .join("\n");
  const lowerAll = allUserText.toLowerCase();
  const lowerMessage = message.toLowerCase();

  const amount = extractAmount(allUserText);
  const tokenSymbol = extractTokenSymbol(lowerAll);
  const fromChainId = inferSourceChainId(lowerAll);
  const riskProfile = inferRiskProfile(lowerAll);
  const wantsStable = /stable|stablecoin|stables|savings|capital preserv/.test(lowerAll);
  const wantsLongTerm = /long term|long-term|park|months|hold|set and forget/.test(lowerAll);
  const needsLiquidity = /liquid|liquidity|flexible|anytime|easy access|short term/.test(lowerAll);
  const wantsProceed = /proceed|go ahead|let'?s do it|do it|move forward|approve|sign|yes\b|let'?s go|prepare|set it up|ready/.test(lowerMessage);
  const wantsQuote = /quote|prepare|route|transaction/.test(lowerMessage);
  const wantsComparison = /compare|options|which one|difference|vs|versus|both|alternatives/.test(lowerMessage);

  const intent = detectIntent(lowerAll);

  const missingFields: string[] = [];
  if (intent === "deposit") {
    if (!amount) missingFields.push("amount");
    if (!riskProfile && !wantsStable) missingFields.push("risk posture");
    if (!wantsLongTerm && !needsLiquidity) missingFields.push("time horizon");
  }

  let phase: ConversationState["phase"];
  if (wantsProceed || wantsQuote) {
    phase = "executing";
  } else if (intent === "deposit" && missingFields.length <= 1 && (amount || riskProfile)) {
    phase = "recommending";
  } else {
    phase = "gathering";
  }

  return {
    intent,
    amount,
    tokenSymbol,
    fromChainId,
    riskProfile,
    wantsStable,
    wantsLongTerm,
    needsLiquidity,
    wantsProceed,
    wantsQuote,
    wantsComparison,
    missingFields,
    phase,
  };
}

function formatConversationStateBlock(state: ConversationState): string {
  const lines = [
    "CONVERSATION STATE:",
    `- Intent: ${state.intent}`,
    `- Phase: ${state.phase}`,
    `- Amount: ${state.amount ?? "unknown"}`,
    `- Token: ${state.tokenSymbol ?? "unknown"}`,
    `- Risk posture: ${state.riskProfile ?? (state.wantsStable ? "safe (inferred from stables preference)" : "unknown")}`,
    `- Time horizon: ${state.wantsLongTerm ? "long-term" : state.needsLiquidity ? "flexible/liquid" : "unknown"}`,
    `- Chain preference: ${state.fromChainId ? chainNameFromId(state.fromChainId) : "unknown"}`,
    `- Wants comparison: ${state.wantsComparison ? "yes" : "no"}`,
    `- Wants to proceed: ${state.wantsProceed ? "yes" : "no"}`,
  ];

  if (state.missingFields.length > 0) {
    lines.push(`- Still missing: ${state.missingFields.join(", ")}`);
  } else if (state.intent === "deposit") {
    lines.push("- All key info gathered — ready to recommend or execute");
  }

  return lines.join("\n");
}

function chainNameFromId(chainId: number): string {
  const map: Record<number, string> = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon" };
  return map[chainId] ?? `Chain ${chainId}`;
}

// ── Smarter Vault Selection ──

function scoreVaultForState(
  vault: CurtisVaultContext,
  state: ConversationState
): number {
  let score = 0;
  const apy = toNumber(vault.apy);
  const apy7d = toNumber(vault.apy7d, apy);
  const apy30d = toNumber(vault.apy30d, apy);
  const tvl = toNumber(vault.tvlUsd);
  const isStable = vault.tags.some((tag) => tag.toLowerCase() === "stablecoin");

  // APY score (capped to avoid chasing outliers)
  score += Math.min(apy, 15) * 2;

  // TVL depth — high TVL is safer
  if (tvl > 100_000_000) score += 10;
  else if (tvl > 10_000_000) score += 6;
  else if (tvl > 1_000_000) score += 3;

  // Yield momentum: 7d trending up vs 30d is good
  const momentum = apy7d - apy30d;
  if (momentum > 0.5) score += 5;
  else if (momentum > 0) score += 2;
  else if (momentum < -1) score -= 5;

  // Risk posture match
  if (state.riskProfile === "safe" || state.wantsStable) {
    if (isStable) score += 15;
    else score -= 10;
    if (tvl > 50_000_000) score += 5;
  } else if (state.riskProfile === "aggressive") {
    score += apy * 1.5; // weight APY more
    if (!isStable) score += 5;
  }

  // Long-term: prefer steady, high-TVL
  if (state.wantsLongTerm) {
    if (Math.abs(momentum) < 0.5) score += 5; // steady yield
    if (tvl > 50_000_000) score += 3;
  }

  // Liquidity needs: prefer high-TVL for easy exit
  if (state.needsLiquidity) {
    if (tvl > 50_000_000) score += 5;
  }

  // Chain preference
  if (state.fromChainId && vault.chainId === state.fromChainId) {
    score += 8; // same chain = no bridging needed
  }

  // Token match
  if (state.tokenSymbol) {
    const vaultTokens = vault.tokens.map((t) => t.toUpperCase());
    if (vaultTokens.includes(state.tokenSymbol.toUpperCase())) score += 8;
  }

  return score;
}

function pickBestVaults(
  vaults: CurtisVaultContext[],
  state: ConversationState,
  count: number
): CurtisVaultContext[] {
  return [...vaults]
    .map((vault) => ({ vault, score: scoreVaultForState(vault, state) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.vault);
}

function buildVaultComparisonItems(
  vaults: CurtisVaultContext[],
  state: ConversationState,
  recommendedIndex = 0
): VaultComparisonItem[] {
  return vaults.map((vault, index) => {
    const apy = toNumber(vault.apy);
    const apy7d = toNumber(vault.apy7d, apy);
    const apy30d = toNumber(vault.apy30d, apy);
    const momentum = apy7d - apy30d;

    let reasoning: string;
    if (index === recommendedIndex) {
      const reasons: string[] = [];
      if (state.wantsStable || state.riskProfile === "safe") reasons.push("stable exposure");
      if (state.wantsLongTerm) reasons.push("steady long-term yield");
      if (state.needsLiquidity) reasons.push("deep liquidity for easy exit");
      if (momentum > 0.3) reasons.push("yield trending up");
      reasoning = reasons.length > 0 ? `Best fit: ${reasons.join(", ")}` : "Strongest overall match";
    } else {
      const tradeoffs: string[] = [];
      if (apy > toNumber(vaults[recommendedIndex].apy)) tradeoffs.push("higher APY");
      else tradeoffs.push("lower APY");
      if (toNumber(vault.tvlUsd) > toNumber(vaults[recommendedIndex].tvlUsd)) tradeoffs.push("deeper TVL");
      reasoning = tradeoffs.length > 0 ? `Alternative: ${tradeoffs.join(", ")}` : "Viable alternative";
    }

    return {
      vaultAddress: vault.address,
      chainId: vault.chainId,
      protocol: vault.protocol,
      chain: vault.chain,
      tokens: vault.tokens,
      apy: vault.apy,
      apy7d: vault.apy7d,
      apy30d: vault.apy30d,
      tvlUsd: vault.tvlUsd,
      recommended: index === recommendedIndex,
      reasoning,
    };
  });
}

// ── Action parsing ──

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
        vaultAddress: typeof action.vaultAddress === "string" ? action.vaultAddress : undefined,
        chainId: typeof action.chainId === "number" ? action.chainId : undefined,
        riskProfile: isRiskProfile(action.riskProfile) ? action.riskProfile : undefined,
        amount: typeof action.amount === "string" ? action.amount : undefined,
        tokenSymbol: typeof action.tokenSymbol === "string" ? action.tokenSymbol.toUpperCase() : undefined,
        fromChainId: typeof action.fromChainId === "number" ? action.fromChainId : undefined,
        autoQuote: typeof action.autoQuote === "boolean" ? action.autoQuote : undefined,
        autoSubmit: typeof action.autoSubmit === "boolean" ? action.autoSubmit : undefined,
        intentNote: typeof action.intentNote === "string" ? action.intentNote : undefined,
      };

    case "open_withdraw":
      return {
        type,
        label,
        vaultAddress: typeof action.vaultAddress === "string" ? action.vaultAddress : undefined,
        chainId: typeof action.chainId === "number" ? action.chainId : undefined,
      };

    case "set_risk_profile":
      if (!isRiskProfile(action.riskProfile)) return null;
      return { type, label, riskProfile: action.riskProfile };

    case "generate_strategy":
      return {
        type,
        label,
        riskProfile: isRiskProfile(action.riskProfile) ? action.riskProfile : undefined,
      };

    case "toggle_curtain":
      return {
        type,
        label,
        open: typeof action.open === "boolean" ? action.open : undefined,
      };

    case "compare_vaults": {
      const vaultsArr = Array.isArray(action.vaults) ? action.vaults : [];
      const items: VaultComparisonItem[] = vaultsArr
        .filter((v: unknown): v is Record<string, unknown> => !!v && typeof v === "object")
        .map((v: Record<string, unknown>) => ({
          vaultAddress: typeof v.vaultAddress === "string" ? v.vaultAddress : "",
          chainId: typeof v.chainId === "number" ? v.chainId : 0,
          protocol: typeof v.protocol === "string" ? v.protocol : "",
          chain: typeof v.chain === "string" ? v.chain : "",
          tokens: Array.isArray(v.tokens) ? (v.tokens as string[]) : [],
          apy: typeof v.apy === "number" ? v.apy : null,
          apy7d: typeof v.apy7d === "number" ? v.apy7d : undefined,
          apy30d: typeof v.apy30d === "number" ? v.apy30d : undefined,
          tvlUsd: typeof v.tvlUsd === "string" ? v.tvlUsd : undefined,
          recommended: typeof v.recommended === "boolean" ? v.recommended : undefined,
          reasoning: typeof v.reasoning === "string" ? v.reasoning : undefined,
        }));
      if (items.length === 0) return null;
      return { type, label, vaults: items };
    }

    case "show_position_analysis":
      return {
        type,
        label,
        vaultAddress: typeof action.vaultAddress === "string" ? action.vaultAddress : undefined,
        chainId: typeof action.chainId === "number" ? action.chainId : undefined,
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

// ── Enrich replies with conversation context ──

function enrichReply(
  reply: CurtisReply,
  state: ConversationState,
  topVaults: CurtisVaultContext[]
): CurtisReply {
  const bestVaults = pickBestVaults(topVaults, state, 3);
  const preferredVault = bestVaults[0];

  const mappedActions = (reply.actions ?? []).map((action) => {
    if (action.type !== "open_deposit") return action;

    return {
      ...action,
      vaultAddress: action.vaultAddress ?? preferredVault?.address,
      chainId: action.chainId ?? preferredVault?.chainId,
      riskProfile: action.riskProfile ?? state.riskProfile ?? (state.wantsStable ? "safe" as const : undefined),
      amount: action.amount ?? state.amount,
      tokenSymbol: action.tokenSymbol ?? state.tokenSymbol,
      fromChainId: action.fromChainId ?? state.fromChainId,
      autoQuote: action.autoQuote ?? (state.wantsProceed || state.wantsQuote ? true : undefined),
      autoSubmit: action.autoSubmit ?? (state.wantsProceed ? true : undefined),
      intentNote: action.intentNote ?? buildIntentNote(state),
    };
  });

  const hasDepositAction = mappedActions.some((a) => a.type === "open_deposit");

  if (
    !hasDepositAction &&
    preferredVault &&
    (state.wantsProceed || state.wantsQuote || (state.intent === "deposit" && state.amount && state.phase === "recommending"))
  ) {
    mappedActions.push({
      type: "open_deposit",
      label: state.wantsProceed || state.wantsQuote
        ? `Prepare ${preferredVault.protocol} deposit`
        : `Review ${preferredVault.protocol} deposit`,
      vaultAddress: preferredVault.address,
      chainId: preferredVault.chainId,
      riskProfile: state.riskProfile ?? (state.wantsStable ? "safe" : "balanced"),
      amount: state.amount,
      tokenSymbol: state.tokenSymbol,
      fromChainId: state.fromChainId,
      autoQuote: state.wantsProceed || state.wantsQuote ? true : undefined,
      autoSubmit: state.wantsProceed ? true : undefined,
      intentNote: buildIntentNote(state),
    });
  }

  return {
    ...reply,
    actions: mappedActions.length > 0 ? mappedActions : undefined,
  };
}

function buildIntentNote(state: ConversationState): string | undefined {
  if (!state.amount && !state.tokenSymbol && !state.riskProfile) return undefined;

  const amountLabel = `${state.amount ?? "Planned"}${state.tokenSymbol ? ` ${state.tokenSymbol}` : ""}`;

  return [
    `${amountLabel} deposit`,
    state.wantsStable || state.riskProfile === "safe"
      ? "stable-focused"
      : state.riskProfile === "aggressive"
        ? "higher-yield"
        : state.riskProfile === "balanced"
          ? "balanced"
          : null,
    state.wantsLongTerm ? "longer-term" : state.needsLiquidity ? "liquid" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ── Local fallback (state-machine driven) ──

function pickWeakestPosition(positions: CurtisPositionContext[]) {
  return [...positions].sort((a, b) => {
    const aTrend = toNumber(a.apy7d, toNumber(a.apy)) - toNumber(a.apy30d, toNumber(a.apy));
    const bTrend = toNumber(b.apy7d, toNumber(b.apy)) - toNumber(b.apy30d, toNumber(b.apy));
    if (aTrend !== bTrend) return aTrend - bTrend;
    return toNumber(b.balanceUsd) - toNumber(a.balanceUsd);
  })[0];
}

function buildLocalReply(
  message: string,
  positions: CurtisPositionContext[],
  topVaults: CurtisVaultContext[],
  chatHistory: Array<{ role: string; content: string }> = []
): CurtisReply {
  const lowerMessage = message.toLowerCase();
  const state = buildConversationState(message, chatHistory);
  const bestVaults = pickBestVaults(topVaults, state, 3);
  const bestVault = bestVaults[0];
  const secondVault = bestVaults[1];
  const largestPosition = [...positions].sort(
    (a, b) => toNumber(b.balanceUsd) - toNumber(a.balanceUsd)
  )[0];
  const weakestPosition = pickWeakestPosition(positions);

  // ── Curtain commands ──

  if (lowerMessage.includes("open the curtain") || lowerMessage.includes("show the curtain")) {
    return {
      message: "Opening the full curtain view so you can inspect chain spread, protocol exposure, and the reasoning behind each move.",
      actions: [{ type: "toggle_curtain", label: "Open curtain view", open: true }],
    };
  }

  if (lowerMessage.includes("close the curtain") || lowerMessage.includes("hide the curtain") || lowerMessage.includes("banking view")) {
    return {
      message: "Tucking the technical layer away and bringing you back to the banking surface.",
      actions: [{ type: "toggle_curtain", label: "Return to banking view", open: false }],
    };
  }

  // ── Withdraw intent ──

  if (state.intent === "withdraw") {
    if (!largestPosition) {
      return { message: "You don't have any live positions to unwind yet." };
    }
    return {
      message: `If you want to unwind capital, I'd start with ${largestPosition.protocol} on ${largestPosition.chain} — it holds ${formatUsd(toNumber(largestPosition.balanceUsd))} right now.`,
      actions: [{
        type: "open_withdraw",
        label: `Withdraw from ${largestPosition.protocol}`,
        vaultAddress: largestPosition.address,
        chainId: largestPosition.chainId,
      }],
    };
  }

  // ── Rebalance / strategy intent ──

  if (state.intent === "rebalance") {
    return {
      message: state.riskProfile
        ? `Refreshing the strategy in ${state.riskProfile} mode so the next plan matches the posture you asked for.`
        : "I can draft a fresh strategy from the live vault set and your current positions.",
      actions: [
        ...(state.riskProfile ? [{ type: "set_risk_profile" as const, label: `Set ${state.riskProfile} profile`, riskProfile: state.riskProfile }] : []),
        { type: "generate_strategy" as const, label: state.riskProfile ? `Generate ${state.riskProfile} strategy` : "Generate new strategy", riskProfile: state.riskProfile },
      ],
    };
  }

  // ── Risk / concentration analysis ──

  if (/risk|concentrat|riskiest/.test(lowerMessage)) {
    if (!largestPosition) {
      return { message: "Your portfolio is empty right now, so there isn't any concentration risk to flag yet." };
    }

    const apy7d = toNumber(largestPosition.apy7d, toNumber(largestPosition.apy));
    const apy30d = toNumber(largestPosition.apy30d, apy7d);
    const trend = apy7d - apy30d;

    return {
      message: `${largestPosition.protocol} on ${largestPosition.chain} is your biggest position at ${formatUsd(toNumber(largestPosition.balanceUsd))}. It's yielding ${formatApy(largestPosition.apy)} right now, and ${
        trend < -0.2
          ? `heads up — that yield has slipped ${Math.abs(trend).toFixed(2)}% versus the 30d trend.`
          : "the yield trend still looks fairly steady."
      }`,
      actions: weakestPosition ? [
        { type: "show_position_analysis" as const, label: `Analyze ${weakestPosition.protocol}`, vaultAddress: weakestPosition.address, chainId: weakestPosition.chainId },
        { type: "generate_strategy" as const, label: "Draft a safer rebalance", riskProfile: "safe" as const },
      ] : undefined,
    };
  }

  // ── Deposit intent: multi-turn state machine ──

  if (state.intent === "deposit" || state.intent === "unknown") {
    // Phase: Executing — user said proceed
    if (state.phase === "executing" && bestVault) {
      const amountLabel = `${state.amount ?? "your"}${state.tokenSymbol ? ` ${state.tokenSymbol}` : ""}`;
      return {
        message: `Setting up the route for ${amountLabel} into ${bestVault.protocol} on ${bestVault.chain}. Your wallet will open for approval.`,
        actions: [{
          type: "open_deposit",
          label: `Prepare ${bestVault.protocol} deposit`,
          vaultAddress: bestVault.address,
          chainId: bestVault.chainId,
          riskProfile: state.riskProfile ?? (state.wantsStable ? "safe" : "balanced"),
          amount: state.amount,
          tokenSymbol: state.tokenSymbol,
          fromChainId: state.fromChainId,
          autoQuote: true,
          autoSubmit: true,
          intentNote: buildIntentNote(state),
        }],
      };
    }

    // Phase: Recommending — we have enough context to suggest
    if (state.phase === "recommending" && bestVault) {
      const apy = toNumber(bestVault.apy);
      const apy7d = toNumber(bestVault.apy7d, apy);
      const apy30d = toNumber(bestVault.apy30d, apy);
      const momentum = apy7d - apy30d;
      const tvl = toNumber(bestVault.tvlUsd);
      const amountLabel = state.amount
        ? `${state.amount}${state.tokenSymbol ? ` ${state.tokenSymbol}` : ""}`
        : "your capital";

      const whyBullets: string[] = [];
      whyBullets.push(`${formatApy(bestVault.apy)} APY${momentum > 0.3 ? ", trending up over 30 days" : momentum < -0.5 ? ", but yield has dipped recently" : " with a steady rate"}`);
      if (tvl > 0) whyBullets.push(`${formatUsd(tvl)} TVL — ${tvl > 50_000_000 ? "deep liquidity" : "decent depth"}`);
      if (state.wantsStable || state.riskProfile === "safe") whyBullets.push("stable exposure, lower volatility");
      if (state.wantsLongTerm) whyBullets.push("solid for longer-term parking");
      if (state.needsLiquidity) whyBullets.push("keeps your move flexible");

      const actions: CurtisAction[] = [{
        type: "open_deposit",
        label: `Review ${bestVault.protocol} deposit`,
        vaultAddress: bestVault.address,
        chainId: bestVault.chainId,
        riskProfile: state.riskProfile ?? (state.wantsStable ? "safe" : "balanced"),
        amount: state.amount,
        tokenSymbol: state.tokenSymbol,
        fromChainId: state.fromChainId,
        intentNote: buildIntentNote(state),
      }];

      // Offer comparison if there's a decent second option
      if (secondVault && state.wantsComparison) {
        actions.unshift({
          type: "compare_vaults",
          label: "Compare top options",
          vaults: buildVaultComparisonItems([bestVault, secondVault], state, 0),
        });
      }

      return {
        message: `For ${amountLabel}, I'd use ${bestVault.protocol} on ${bestVault.chain} for ${bestVault.tokens.join("/")}.

Why it fits:
${whyBullets.map((b) => `- ${b}`).join("\n")}

Say proceed and I'll prepare the route, or ask me to compare alternatives.`,
        actions,
      };
    }

    // Phase: Gathering — ask smart follow-ups based on what's missing
    if (state.missingFields.length > 0) {
      // First missing: amount + risk posture
      if (!state.amount && !state.riskProfile && !state.wantsStable) {
        return {
          message: "How much are we looking at, and are you thinking stables for a safer play or do you want exposure to volatile assets too?",
        };
      }

      // Have risk, missing amount
      if (!state.amount) {
        const tokenHint = state.tokenSymbol ? ` in ${state.tokenSymbol}` : "";
        return {
          message: `Got it${state.riskProfile ? `, ${state.riskProfile} posture` : state.wantsStable ? ", stables" : ""}. What's the rough amount${tokenHint} you're working with?`,
        };
      }

      // Have amount, missing risk
      if (!state.riskProfile && !state.wantsStable) {
        return {
          message: `${state.amount}${state.tokenSymbol ? ` ${state.tokenSymbol}` : ""} noted. Are you after stable, lower-risk yield or are you comfortable with something more aggressive for higher returns?`,
        };
      }

      // Have amount + risk, missing time horizon
      if (!state.wantsLongTerm && !state.needsLiquidity) {
        return {
          message: `Are you parking this long-term, or do you want easy access if something comes up?`,
        };
      }
    }

    // Fallback for deposit-ish intent with no vault data
    if (!bestVault) {
      return {
        message: "I couldn't pull a clean live ranking of vaults just yet. Try again in a moment and I'll line up the best route.",
      };
    }

    // Generic deposit-adjacent query when we have everything
    if (bestVault) {
      return {
        message: `My strongest live pick right now is ${bestVault.protocol} on ${bestVault.chain} for ${bestVault.tokens.join("/")} at ${formatApy(bestVault.apy)}.${
          toNumber(bestVault.apy7d) > toNumber(bestVault.apy30d) ? " Yield momentum is moving the right way." : ""
        } Want me to prepare the route?`,
        actions: [
          {
            type: "open_deposit",
            label: `Open ${bestVault.protocol} deposit`,
            vaultAddress: bestVault.address,
            chainId: bestVault.chainId,
            riskProfile: state.riskProfile ?? (state.wantsStable ? "safe" : undefined),
          },
          {
            type: "compare_vaults",
            label: "Compare top options",
            vaults: buildVaultComparisonItems(bestVaults.slice(0, 2), state, 0),
          },
        ],
      };
    }
  }

  // ── Risk profile change ──

  if (state.riskProfile && state.intent === "unknown") {
    return {
      message: `Shifting the whole interface into a ${state.riskProfile} posture and refreshing the strategy from there.`,
      actions: [
        { type: "set_risk_profile", label: `Set ${state.riskProfile} profile`, riskProfile: state.riskProfile },
        { type: "generate_strategy", label: `Generate ${state.riskProfile} strategy`, riskProfile: state.riskProfile },
      ],
    };
  }

  // ── Fallback: portfolio summary ──

  if (positions.length === 0) {
    if (!bestVault) {
      return { message: "I couldn't find any live vault data right now. Give me another shot in a moment." };
    }
    return {
      message: `No positions yet. Tell me the amount and what kind of yield you're after — stables, volatile exposure, aggressive or safe — and I'll find the best starting point.`,
      actions: [
        { type: "generate_strategy", label: "Generate balanced plan", riskProfile: "balanced" },
        { type: "generate_strategy", label: "Generate safe plan", riskProfile: "safe" },
      ],
    };
  }

  const totalBalance = positions.reduce((sum, p) => sum + toNumber(p.balanceUsd), 0);
  const blendedApy = totalBalance > 0
    ? positions.reduce((sum, p) => {
        const weight = toNumber(p.balanceUsd) / totalBalance;
        return sum + toNumber(p.apy) * weight;
      }, 0)
    : 0;

  return {
    message: `You're sitting on ${formatUsd(totalBalance)} across ${positions.length} live position${positions.length === 1 ? "" : "s"}, with a blended yield around ${formatApy(blendedApy)}. Ask me to de-risk, find a better pool, or prepare a deposit route.`,
    actions: [
      { type: "generate_strategy", label: "Generate new strategy" },
      { type: "toggle_curtain", label: "Open curtain view", open: true },
    ],
  };
}

// ── POST handler ──

export async function POST(req: NextRequest) {
  try {
    const { message, positions = [], topVaults = [], chatHistory = [] } =
      (await req.json()) as {
        message: string;
        positions?: CurtisPositionContext[];
        topVaults?: CurtisVaultContext[];
        chatHistory?: Array<{ role: string; content: string }>;
      };

    const state = buildConversationState(message, chatHistory);

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

TOP AVAILABLE VAULTS (scored for this user's profile):
${
  topVaults.length > 0
    ? pickBestVaults(topVaults, state, 10)
        .map(
          (vault) =>
            `- ${vault.protocol} ${vault.tokens.join("/")} on ${vault.chain} (${vault.address}): APY ${vault.apy}% | 7d: ${vault.apy7d ?? "n/a"}% | 30d: ${vault.apy30d ?? "n/a"}% | TVL: $${vault.tvlUsd ?? "n/a"} | Tags: ${vault.tags.join(", ")}`
        )
        .join("\n")
    : "No vault data available."
}

${formatConversationStateBlock(state)}`;

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
        max_tokens: 1000,
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
      enrichReply(parseActions(rawText), state, topVaults)
    );
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { message: "AI service is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
