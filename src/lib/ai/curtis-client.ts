import type { ChatMessage, Position, Vault } from "@/lib/types";
import type { CurtisReply, CurtisRequestBody } from "@/lib/ai/curtis-contract";

export function buildCurtisRequestBody(
  message: string,
  positions: Position[],
  vaults: Vault[],
  chatMessages: ChatMessage[]
): CurtisRequestBody {
  return {
    message,
    positions: positions.map((position) => ({
      protocol: position.vault.protocol.name,
      tokens: position.vault.tokens.map((token) => token.symbol),
      chain: position.vault.network,
      chainId: position.vault.chainId,
      address: position.vault.address,
      balanceUsd: position.balanceUsd,
      apy: position.vault.analytics.totalApy,
      apy7d: position.vault.analytics.apy7d,
      apy30d: position.vault.analytics.apy30d,
      tvlUsd: position.vault.analytics.tvlUsd,
    })),
    topVaults: vaults
      .filter((vault) => vault.isTransactional && vault.analytics.totalApy !== null)
      .sort((a, b) => (b.analytics.totalApy ?? 0) - (a.analytics.totalApy ?? 0))
      .slice(0, 15)
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
      })),
    chatHistory: chatMessages
      .slice(-10)
      .map(({ role, content }) => ({ role, content })),
  };
}

export async function fetchCurtisReply(
  message: string,
  positions: Position[],
  vaults: Vault[],
  chatMessages: ChatMessage[]
): Promise<CurtisReply> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildCurtisRequestBody(message, positions, vaults, chatMessages)
    ),
  });

  const payload = (await response.json().catch(() => null)) as Partial<CurtisReply> | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Curtis could not respond right now.");
  }

  return {
    message: payload?.message || "Sorry, I couldn't process that request.",
    actions:
      payload?.actions && payload.actions.length > 0 ? payload.actions : undefined,
  };
}
