"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Providers from "../providers";
import { useDashboardData } from "@/hooks/useDashboardData";
import FinancialHeader from "@/components/dashboard/FinancialHeader";
import PortfolioCard from "@/components/dashboard/PortfolioCard";
import InsightStrip from "@/components/dashboard/InsightStrip";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import SystemSignals from "@/components/dashboard/SystemSignals";
import PositionsList from "@/components/dashboard/PositionsList";
import CurtisChat from "@/components/dashboard/CurtisChat";
import CurtainOverlay from "@/components/dashboard/CurtainOverlay";
import DepositModal from "@/components/dashboard/DepositModal";
import WithdrawModal from "@/components/dashboard/WithdrawModal";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function DashboardContent() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useDashboardData();

  useEffect(() => {
    if (!isConnected) {
      router.replace("/");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  return (
    <div className="min-h-screen text-curt-text">
      <div className="relative isolate pb-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(15,139,99,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,108,189,0.14),transparent_22%)]" />

        <nav className="relative z-10 mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="command-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[20px] font-semibold tracking-tight text-curt-text">
                  curt<span className="text-curt-accent">.fi</span>
                </span>
                <p className="text-[12px] text-curt-text-muted">Banking calm in front. DeFi machinery behind the curtain.</p>
              </div>
              <div className="soft-pill hidden sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-curt-accent live-dot" />
                Curtis command deck live
              </div>
            </div>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </nav>

        <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
          <CurtisChat />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            <div className="space-y-6">
              <PortfolioCard />
              <PositionsList />
            </div>

            <div className="space-y-6">
              <FinancialHeader />
              <InsightStrip />
              <RecommendationCard />
              <SystemSignals />
            </div>
          </div>
        </main>

        <CurtainOverlay />
        <DepositModal />
        <WithdrawModal />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  );
}
