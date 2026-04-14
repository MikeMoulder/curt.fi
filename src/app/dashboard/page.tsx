"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Providers from "../providers";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useStore } from "@/store/useStore";
import CurtisStage from "@/components/dashboard/CurtisStage";
import PortfolioCard from "@/components/dashboard/PortfolioCard";
import InsightStrip from "@/components/dashboard/InsightStrip";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import SystemSignals from "@/components/dashboard/SystemSignals";
import PositionsList from "@/components/dashboard/PositionsList";
import CurtainOverlay from "@/components/dashboard/CurtainOverlay";
import DepositModal from "@/components/dashboard/DepositModal";
import WithdrawModal from "@/components/dashboard/WithdrawModal";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function DashboardContent() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const toggleCurtain = useStore((state) => state.toggleCurtain);
  const positions = useStore((state) => state.positions);
  const riskProfile = useStore((state) => state.riskProfile);
  const vaults = useStore((state) => state.vaults);

  useDashboardData();

  useEffect(() => {
    if (!isConnected) {
      router.replace("/");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  const heading = positions.length
    ? "Curtis is running point on the portfolio."
    : "Curtis is ready to design the first move.";

  const supportingCopy = positions.length
    ? "He now owns the visual center of the room: reading the market, proposing the next move, and exposing the full routing logic when you want proof."
    : "Start from a posture, let Curtis map the route, and open the technical layer only when you want to inspect the machinery underneath.";

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
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-end">
            <div>
              <span className="section-label">Curtis Center Stage</span>
              <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,5vw,5rem)] font-semibold leading-[0.94] tracking-[-0.07em] text-curt-text">
                {heading}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-curt-text-secondary sm:text-[17px] sm:leading-8">
                {supportingCopy}
              </p>
            </div>

            <aside className="ghost-panel p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-curt-text-muted">
                Transparency Layer
              </p>
              <p className="mt-3 text-[18px] font-semibold tracking-[-0.04em] text-curt-text">
                The curtain is one pull away.
              </p>
              <p className="mt-2 text-sm leading-6 text-curt-text-secondary">
                Inspect chain spread, protocol concentration, and the reasoning behind every move without leaving the dashboard.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button onClick={toggleCurtain} className="btn-secondary px-4 py-2.5 text-[13px]">
                  Open curtain
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-curt-text-muted">
                  {positions.length} positions · {(vaults.length || 672).toLocaleString()} watched · {riskProfile}
                </span>
              </div>
            </aside>
          </section>

          <CurtisStage />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <RecommendationCard />
            <InsightStrip />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <PortfolioCard />
            <SystemSignals />
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <PositionsList />

            <aside className="ghost-panel p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-curt-text-muted">
                Why This Feels Different
              </p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-curt-text">
                Curtis leads. The rest explains.
              </h2>
              <p className="mt-3 text-sm leading-7 text-curt-text-secondary">
                The dashboard now gives Curtis the dominant surface, lets the conversation drive next steps, and keeps the technical proof close instead of burying him in a corner.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Generate a fresh thesis without leaving the main surface.",
                  "Shift risk posture directly from Curtis before you move capital.",
                  "Open the curtain when you want the raw routing and allocation detail.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-black/8 bg-white/58 px-4 py-3 text-sm text-curt-text-secondary"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>
          </section>
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
