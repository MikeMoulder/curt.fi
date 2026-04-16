import { create } from "zustand";
import type {
  Vault,
  Position,
  ChatMessage,
  RiskProfile,
  Strategy,
  DepositDraft,
} from "@/lib/types";

interface AppState {
  // View
  curtainOpen: boolean;
  toggleCurtain: () => void;

  // Data
  vaults: Vault[];
  setVaults: (v: Vault[]) => void;
  positions: Position[];
  setPositions: (p: Position[]) => void;
  portfolioRefreshNonce: number;
  requestPortfolioRefresh: () => void;

  // Portfolio computed
  totalBalance: number;
  blendedApy: number;
  computePortfolio: () => void;

  // Strategy
  riskProfile: RiskProfile;
  setRiskProfile: (r: RiskProfile) => void;
  strategy: Strategy | null;
  setStrategy: (s: Strategy | null) => void;

  // Modals
  depositOpen: boolean;
  setDepositOpen: (open: boolean) => void;
  depositVaultAddress: string | null;
  setDepositVaultAddress: (vaultAddress: string | null) => void;
  depositDraft: DepositDraft | null;
  setDepositDraft: (draft: DepositDraft | null) => void;
  clearDepositDraft: () => void;
  withdrawOpen: boolean;
  setWithdrawOpen: (open: boolean) => void;
  withdrawVaultAddress: string | null;
  setWithdrawVaultAddress: (vaultAddress: string | null) => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Loading
  loading: boolean;
  setLoading: (l: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  curtainOpen: false,
  toggleCurtain: () => set((s) => ({ curtainOpen: !s.curtainOpen })),

  vaults: [],
  setVaults: (vaults) => set({ vaults }),
  positions: [],
  setPositions: (positions) => {
    set({ positions: positions ?? [] });
    get().computePortfolio();
  },
  portfolioRefreshNonce: 0,
  requestPortfolioRefresh: () =>
    set((state) => ({
      portfolioRefreshNonce: state.portfolioRefreshNonce + 1,
    })),

  totalBalance: 0,
  blendedApy: 0,
  computePortfolio: () => {
    const positions = get().positions ?? [];
    const totalBalance = positions.reduce(
      (sum, p) => sum + parseFloat(p.balanceUsd || "0"),
      0
    );
    const blendedApy =
      totalBalance > 0
        ? positions.reduce((sum, p) => {
            const weight = parseFloat(p.balanceUsd || "0") / totalBalance;
            return sum + (p.vault.analytics.totalApy ?? 0) * weight;
          }, 0)
        : 0;
    set({ totalBalance, blendedApy });
  },

  riskProfile: "balanced",
  setRiskProfile: (riskProfile) => set({ riskProfile }),
  strategy: null,
  setStrategy: (strategy) => set({ strategy }),

  depositOpen: false,
  setDepositOpen: (depositOpen) => set({ depositOpen }),
  depositVaultAddress: null,
  setDepositVaultAddress: (depositVaultAddress) => set({ depositVaultAddress }),
  depositDraft: null,
  setDepositDraft: (depositDraft) => set({ depositDraft }),
  clearDepositDraft: () => set({ depositDraft: null }),
  withdrawOpen: false,
  setWithdrawOpen: (withdrawOpen) => set({ withdrawOpen }),
  withdrawVaultAddress: null,
  setWithdrawVaultAddress: (withdrawVaultAddress) =>
    set({ withdrawVaultAddress }),

  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
