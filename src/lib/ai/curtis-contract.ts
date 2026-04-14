import type { CurtisAction } from "@/lib/types";

export interface CurtisPositionContext {
  protocol: string;
  tokens: string[];
  chain: string;
  chainId: number;
  address: string;
  balanceUsd: string;
  apy: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvlUsd?: string;
}

export interface CurtisVaultContext {
  protocol: string;
  tokens: string[];
  chain: string;
  chainId: number;
  address: string;
  apy: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvlUsd?: string;
  tags: string[];
}

export interface CurtisChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface CurtisRequestBody {
  message: string;
  positions: CurtisPositionContext[];
  topVaults: CurtisVaultContext[];
  chatHistory: CurtisChatHistoryItem[];
}

export interface CurtisReply {
  message: string;
  actions?: CurtisAction[];
}
