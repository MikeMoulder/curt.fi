import type { RiskProfile } from "@/lib/types";

export interface StrategyVaultInput {
  address: string;
  chain: string;
  chainId: number;
  protocol: string;
  tokens: string[];
  apy: number | null;
  apy7d: number | null;
  apy30d: number | null;
  tvlUsd: string | number;
  tags: string[];
  isTransactional?: boolean;
}

export interface StrategyPositionInput {
  protocol: string;
  tokens: string[];
  chain: string;
  balanceUsd: string | number;
  apy: number | null;
}

export interface StrategyAllocation {
  vaultAddress: string;
  chain: string;
  chainId: number;
  protocol: string;
  tokens: string;
  percentage: number;
  apy: number;
  reasoning: string;
}

export interface StrategyResult {
  allocations: StrategyAllocation[];
  blendedApy: number;
  riskScore: "low" | "medium" | "high";
  summary: string;
}

interface ExistingExposure {
  protocolShare: Map<string, number>;
  chainShare: Map<string, number>;
}

const PROTOCOL_CAP = 30;
const CHAIN_CAP = 40;
const MAX_VAULT_WEIGHT_BY_PROFILE: Record<RiskProfile, number> = {
  safe: 35,
  balanced: 35,
  aggressive: 40,
};
const MIN_TVL_BY_PROFILE: Record<RiskProfile, number> = {
  safe: 1_000_000,
  balanced: 500_000,
  aggressive: 100_000,
};
const SAFE_PREFERRED_PROTOCOLS = new Set(["aave", "morpho"]);

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeProtocol(protocol: string): string {
  return protocol.trim().toLowerCase();
}

function normalizeChain(chain: string): string {
  return chain.trim().toLowerCase();
}

function calculateExistingExposure(
  positions: StrategyPositionInput[]
): ExistingExposure {
  const totalBalance = positions.reduce(
    (sum, position) => sum + Math.max(0, toNumber(position.balanceUsd)),
    0
  );

  const protocolShare = new Map<string, number>();
  const chainShare = new Map<string, number>();

  if (totalBalance <= 0) {
    return { protocolShare, chainShare };
  }

  positions.forEach((position) => {
    const share = (Math.max(0, toNumber(position.balanceUsd)) / totalBalance) * 100;
    const protocolKey = normalizeProtocol(position.protocol);
    const chainKey = normalizeChain(position.chain);

    protocolShare.set(protocolKey, (protocolShare.get(protocolKey) ?? 0) + share);
    chainShare.set(chainKey, (chainShare.get(chainKey) ?? 0) + share);
  });

  return { protocolShare, chainShare };
}

function scoreVault(
  vault: StrategyVaultInput,
  riskProfile: RiskProfile,
  exposure: ExistingExposure
): number {
  const apy = Math.max(0, toNumber(vault.apy));
  const apy7d = toNumber(vault.apy7d, apy);
  const apy30d = toNumber(vault.apy30d, apy7d);
  const tvl = Math.max(1, toNumber(vault.tvlUsd));
  const momentum = apy7d - apy30d;
  const isStable = vault.tags.some((tag) => tag.toLowerCase() === "stablecoin");

  const protocolKey = normalizeProtocol(vault.protocol);
  const chainKey = normalizeChain(vault.chain);
  const existingProtocolShare = exposure.protocolShare.get(protocolKey) ?? 0;
  const existingChainShare = exposure.chainShare.get(chainKey) ?? 0;

  const apyScore = Math.min(1.75, apy / 12);
  const momentumScore = Math.max(-0.8, Math.min(1.2, momentum / 4));
  const tvlScore = Math.log10(tvl) / 8;
  const diversificationScore =
    Math.max(-1.2, (PROTOCOL_CAP - existingProtocolShare) / 35) +
    Math.max(-1.1, (CHAIN_CAP - existingChainShare) / 45);

  let profileBonus = 0;
  if (riskProfile === "safe") {
    profileBonus += isStable ? 0.9 : -2;
    profileBonus += SAFE_PREFERRED_PROTOCOLS.has(protocolKey) ? 0.5 : -0.3;
  }
  if (riskProfile === "balanced") {
    profileBonus += isStable ? 0.25 : 0.15;
  }
  if (riskProfile === "aggressive") {
    profileBonus += Math.min(0.5, apy / 25);
  }

  return apyScore + momentumScore + tvlScore + diversificationScore + profileBonus;
}

function buildReasoning(vault: StrategyVaultInput, exposure: ExistingExposure): string {
  const apy = toNumber(vault.apy);
  const apy7d = toNumber(vault.apy7d, apy);
  const apy30d = toNumber(vault.apy30d, apy7d);
  const momentum = apy7d - apy30d;
  const tvl = toNumber(vault.tvlUsd);
  const protocolShare = exposure.protocolShare.get(normalizeProtocol(vault.protocol)) ?? 0;
  const chainShare = exposure.chainShare.get(normalizeChain(vault.chain)) ?? 0;

  const momentumText =
    momentum > 0.2
      ? `yield momentum is positive (+${momentum.toFixed(2)}% over 7d vs 30d)`
      : momentum < -0.2
        ? `yield trend is cooling (${momentum.toFixed(2)}% over 7d vs 30d)`
        : "yield trend is stable";

  const diversificationText =
    protocolShare > 20 || chainShare > 25
      ? "it also helps reduce current concentration"
      : "it keeps diversification healthy";

  return `${momentumText}, TVL is ${Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(tvl)}, and ${diversificationText}.`;
}

function normalizeAllocations(percentages: number[]): number[] {
  const rounded = percentages.map((percentage) => Math.round(percentage));
  let delta = 100 - rounded.reduce((sum, value) => sum + value, 0);

  if (delta === 0) {
    return rounded;
  }

  const fractionalOrder = percentages
    .map((percentage, index) => ({
      index,
      fraction: percentage - Math.floor(percentage),
    }))
    .sort((a, b) => (delta > 0 ? b.fraction - a.fraction : a.fraction - b.fraction));

  let cursor = 0;
  while (delta !== 0 && fractionalOrder.length > 0) {
    const target = fractionalOrder[cursor % fractionalOrder.length].index;
    if (delta > 0) {
      rounded[target] += 1;
      delta -= 1;
    } else if (rounded[target] > 0) {
      rounded[target] -= 1;
      delta += 1;
    }
    cursor += 1;
    if (cursor > 500) break;
  }

  return rounded;
}

export function generateStrategy(
  vaults: StrategyVaultInput[],
  riskProfile: RiskProfile,
  positions: StrategyPositionInput[] = []
): StrategyResult {
  const minTvl = MIN_TVL_BY_PROFILE[riskProfile];
  const existingExposure = calculateExistingExposure(positions);

  const filtered = vaults.filter((vault) => {
    const tvl = toNumber(vault.tvlUsd);
    const apy = toNumber(vault.apy);
    const isStable = vault.tags.some((tag) => tag.toLowerCase() === "stablecoin");
    const transactional = vault.isTransactional !== false;

    if (!transactional) return false;
    if (tvl < minTvl) return false;
    if (apy <= 0) return false;
    if (riskProfile === "safe" && !isStable) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      allocations: [],
      blendedApy: 0,
      riskScore:
        riskProfile === "safe"
          ? "low"
          : riskProfile === "balanced"
            ? "medium"
            : "high",
      summary:
        "No vaults meet the current risk profile filters. Try lowering constraints or using a different profile.",
    };
  }

  const ranked = filtered
    .map((vault) => ({
      vault,
      score: scoreVault(vault, riskProfile, existingExposure),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const selected = ranked.slice(0, Math.min(5, ranked.length));
  const protocolExposure = new Map<string, number>();
  const chainExposure = new Map<string, number>();
  const percentages = new Array<number>(selected.length).fill(0);
  const maxVaultWeight = MAX_VAULT_WEIGHT_BY_PROFILE[riskProfile];

  let remaining = 100;
  while (remaining > 0) {
    let changed = false;

    for (let index = 0; index < selected.length && remaining > 0; index += 1) {
      const { vault } = selected[index];
      const protocolKey = normalizeProtocol(vault.protocol);
      const chainKey = normalizeChain(vault.chain);
      const protocolUsed =
        (protocolExposure.get(protocolKey) ?? 0) +
        (existingExposure.protocolShare.get(protocolKey) ?? 0);
      const chainUsed =
        (chainExposure.get(chainKey) ?? 0) +
        (existingExposure.chainShare.get(chainKey) ?? 0);

      const protocolRoom = PROTOCOL_CAP - protocolUsed;
      const chainRoom = CHAIN_CAP - chainUsed;
      const vaultRoom = maxVaultWeight - percentages[index];
      const chunk = Math.min(10, remaining, protocolRoom, chainRoom, vaultRoom);

      if (chunk <= 0) continue;

      percentages[index] += chunk;
      protocolExposure.set(
        protocolKey,
        (protocolExposure.get(protocolKey) ?? 0) + chunk
      );
      chainExposure.set(chainKey, (chainExposure.get(chainKey) ?? 0) + chunk);
      remaining -= chunk;
      changed = true;
    }

    if (!changed) break;
  }

  if (remaining > 0) {
    for (let index = 0; index < selected.length && remaining > 0; index += 1) {
      const room = Math.max(0, 100 - percentages[index]);
      if (room <= 0) continue;
      const extra = Math.min(room, remaining);
      percentages[index] += extra;
      remaining -= extra;
    }
  }

  const nonZero = selected
    .map((item, index) => ({ ...item, percentage: percentages[index] }))
    .filter((item) => item.percentage > 0);

  const totalPercentage = nonZero.reduce(
    (sum, item) => sum + item.percentage,
    0
  );
  const normalizedRaw = nonZero.map(
    (item) => (item.percentage / totalPercentage) * 100
  );
  const normalized = normalizeAllocations(normalizedRaw);

  const allocations: StrategyAllocation[] = nonZero.map(({ vault }, index) => ({
    vaultAddress: vault.address,
    chain: vault.chain,
    chainId: vault.chainId,
    protocol: vault.protocol,
    tokens: vault.tokens.join("/"),
    percentage: normalized[index],
    apy: Number(toNumber(vault.apy).toFixed(2)),
    reasoning: buildReasoning(vault, existingExposure),
  }));

  const blendedApy = allocations.reduce(
    (sum, allocation) => sum + allocation.apy * (allocation.percentage / 100),
    0
  );

  const uniqueProtocols = new Set(allocations.map((allocation) => allocation.protocol))
    .size;
  const uniqueChains = new Set(allocations.map((allocation) => allocation.chainId))
    .size;
  const currentPortfolioValue = positions.reduce(
    (sum, position) => sum + Math.max(0, toNumber(position.balanceUsd)),
    0
  );

  return {
    allocations,
    blendedApy: Number(blendedApy.toFixed(2)),
    riskScore:
      riskProfile === "safe"
        ? "low"
        : riskProfile === "balanced"
          ? "medium"
          : "high",
    summary:
      currentPortfolioValue > 0
        ? `Based on your existing ${Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(currentPortfolioValue)} portfolio, this spreads fresh capital across ${allocations.length} vaults on ${uniqueChains} chains and ${uniqueProtocols} protocols, targeting ${blendedApy.toFixed(2)}% blended APY.`
        : `Allocated across ${allocations.length} vaults on ${uniqueChains} chains and ${uniqueProtocols} protocols, targeting ${blendedApy.toFixed(2)}% blended APY with ${riskProfile} risk settings.`,
  };
}
