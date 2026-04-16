import type { CurtisAction, RiskProfile, Strategy, Vault } from "@/lib/types";
import { useStore } from "@/store/useStore";

function buildStrategyVaults(vaults: Vault[]) {
  return vaults
    .filter(
      (vault) =>
        vault.isTransactional &&
        vault.analytics.totalApy !== null &&
        vault.analytics.totalApy > 0
    )
    .sort((a, b) => (b.analytics.totalApy ?? 0) - (a.analytics.totalApy ?? 0))
    .slice(0, 30)
    .map((vault) => ({
      protocol: vault.protocol.name,
      tokens: vault.tokens.map((token) => token.symbol),
      chain: vault.network,
      chainId: vault.chainId,
      address: vault.address,
      apy: vault.analytics.totalApy,
      apy7d: vault.analytics.apy7d,
      apy30d: vault.analytics.apy30d,
      tvlUsd: vault.analytics.tvlUsd,
      tags: vault.tags,
    }));
}

function buildStrategyPositions() {
  return useStore.getState().positions.map((position) => ({
    protocol: position.vault.protocol.name,
    tokens: position.vault.tokens.map((token) => token.symbol),
    chain: position.vault.network,
    balanceUsd: position.balanceUsd,
    apy: position.vault.analytics.totalApy,
  }));
}

function mapStrategyResponse(data: {
  allocations: Array<Record<string, unknown>>;
  blendedApy: number;
  riskScore: string;
  summary: string;
}): Strategy {
  const { vaults } = useStore.getState();

  return {
    allocations: data.allocations.map((allocation) => ({
      vault:
        vaults.find((vault) => vault.address === allocation.vaultAddress) || {
          address: allocation.vaultAddress as string,
          network: allocation.chain as string,
          chainId: allocation.chainId as number,
          protocol: { name: allocation.protocol as string },
          tokens: [
            {
              symbol: allocation.tokens as string,
              address: "",
              decimals: 18,
              name: "",
              chainId: allocation.chainId as number,
            },
          ],
          analytics: {
            baseApy: null,
            rewardApy: null,
            totalApy: allocation.apy as number,
            apy1d: null,
            apy7d: null,
            apy30d: null,
            tvlUsd: "0",
          },
          tags: [],
          isTransactional: true,
        },
      percentage: allocation.percentage as number,
      reasoning: allocation.reasoning as string,
    })),
    blendedApy: data.blendedApy,
    riskScore: data.riskScore,
    summary: data.summary,
  };
}

export async function generateStrategyFromStore(
  riskProfileOverride?: RiskProfile
) {
  const state = useStore.getState();
  const targetProfile = riskProfileOverride ?? state.riskProfile;

  if (riskProfileOverride && riskProfileOverride !== state.riskProfile) {
    state.setRiskProfile(riskProfileOverride);
  }

  state.setStrategy(null);

  const topVaults = buildStrategyVaults(useStore.getState().vaults);
  if (!topVaults.length) {
    return { ok: false as const, error: "No depositable vaults are available yet." };
  }

  const response = await fetch("/api/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vaults: topVaults,
      riskProfile: targetProfile,
      positions: buildStrategyPositions(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    return {
      ok: false as const,
      error: payload?.error || "Curtis couldn't generate a strategy right now.",
    };
  }

  const data = (await response.json()) as {
    allocations: Array<Record<string, unknown>>;
    blendedApy: number;
    riskScore: string;
    summary: string;
  };

  const strategy = mapStrategyResponse(data);
  useStore.getState().setStrategy(strategy);

  return { ok: true as const, strategy };
}

export async function executeCurtisAction(action: CurtisAction) {
  const state = useStore.getState();

  switch (action.type) {
    case "open_deposit":
      if (action.riskProfile) {
        state.setRiskProfile(action.riskProfile);
        state.setStrategy(null);
      }
      state.setWithdrawOpen(false);
      state.setDepositVaultAddress(action.vaultAddress ?? null);
      state.setDepositDraft(
        action.amount ||
          action.tokenSymbol ||
          action.fromChainId ||
          action.autoQuote ||
          action.autoSubmit ||
          action.intentNote
          ? {
              amount: action.amount,
              tokenSymbol: action.tokenSymbol,
              fromChainId: action.fromChainId,
              autoQuote: action.autoQuote,
              autoSubmit: action.autoSubmit,
              intentNote: action.intentNote,
            }
          : null
      );
      state.setDepositOpen(true);
      return { ok: true as const };

    case "open_withdraw":
      state.setDepositOpen(false);
      state.clearDepositDraft();
      state.setWithdrawVaultAddress(action.vaultAddress ?? null);
      state.setWithdrawOpen(true);
      return { ok: true as const };

    case "set_risk_profile":
      state.setRiskProfile(action.riskProfile);
      state.setStrategy(null);
      return { ok: true as const };

    case "generate_strategy":
      return generateStrategyFromStore(action.riskProfile);

    case "toggle_curtain":
      if (typeof action.open === "boolean") {
        const isOpen = useStore.getState().curtainOpen;
        if (isOpen !== action.open) {
          state.toggleCurtain();
        }
      } else {
        state.toggleCurtain();
      }
      return { ok: true as const };
  }
}
