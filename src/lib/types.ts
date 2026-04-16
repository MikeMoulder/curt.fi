// ── LI.FI Earn Data API Types ──

export interface VaultToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId: number;
  logoURI?: string;
  priceUsd?: string;
}

export interface VaultProtocol {
  name: string;
  logoURI?: string;
  url?: string;
}

export interface VaultAnalytics {
  baseApy: number | null;
  rewardApy: number | null;
  totalApy: number | null;
  apy1d: number | null;
  apy7d: number | null;
  apy30d: number | null;
  tvlUsd: string; // string, not number
}

export interface Vault {
  address: string;
  network: string;
  chainId: number;
  protocol: VaultProtocol;
  tokens: VaultToken[];
  analytics: VaultAnalytics;
  tags: string[];
  isTransactional: boolean;
  isRedeemable?: boolean;
  name?: string;
}

export interface VaultsResponse {
  data: Vault[];
  nextCursor?: string;
}

export interface Chain {
  id: number;
  name: string;
  logoURI?: string;
}

export interface Protocol {
  name: string;
  logoURI?: string;
}

export interface Position {
  vault: Vault;
  balanceUsd: string;
  balance: string;
  underlyingBalance: string;
}

export interface PortfolioResponse {
  data: Position[];
}

// ── Composer Types ──

export interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string; // vault address
  fromAddress: string;
  toAddress: string;
  fromAmount: string;
}

export interface QuoteResponse {
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice?: string;
    chainId: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    approvalAddress?: string;
  };
  action: {
    fromToken: VaultToken;
    toToken: VaultToken;
    fromChainId: number;
    toChainId: number;
  };
}

// ── App Types ──

export type RiskProfile = "safe" | "balanced" | "aggressive";

export interface Allocation {
  vault: Vault;
  percentage: number;
  reasoning: string;
}

export interface Strategy {
  allocations: Allocation[];
  blendedApy: number;
  riskScore: string;
  summary: string;
}

export interface DepositDraft {
  fromChainId?: number;
  tokenSymbol?: string;
  amount?: string;
  autoQuote?: boolean;
  autoSubmit?: boolean;
  intentNote?: string;
}

export type CurtisAction =
  | {
      type: "open_deposit";
      label: string;
      vaultAddress?: string;
      chainId?: number;
      riskProfile?: RiskProfile;
      amount?: string;
      tokenSymbol?: string;
      fromChainId?: number;
      autoQuote?: boolean;
      autoSubmit?: boolean;
      intentNote?: string;
    }
  | {
      type: "open_withdraw";
      label: string;
      vaultAddress?: string;
      chainId?: number;
    }
  | {
      type: "set_risk_profile";
      label: string;
      riskProfile: RiskProfile;
    }
  | {
      type: "generate_strategy";
      label: string;
      riskProfile?: RiskProfile;
    }
  | {
      type: "toggle_curtain";
      label: string;
      open?: boolean;
    };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: CurtisAction[];
}
