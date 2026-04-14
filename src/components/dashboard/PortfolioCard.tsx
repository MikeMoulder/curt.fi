"use client";

import { useStore } from "@/store/useStore";
import { generateStrategyFromStore } from "@/lib/ai/curtis-actions";
import { formatUsd, formatApy } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PortfolioCard() {
  const totalBalance = useStore((s) => s.totalBalance);
  const blendedApy = useStore((s) => s.blendedApy);
  const positions = useStore((s) => s.positions);
  const riskProfile = useStore((s) => s.riskProfile);
  const loading = useStore((s) => s.loading);
  const setDepositOpen = useStore((s) => s.setDepositOpen);
  const setWithdrawOpen = useStore((s) => s.setWithdrawOpen);
  const toggleCurtain = useStore((s) => s.toggleCurtain);

  const dailyEarnings = totalBalance * (blendedApy / 100 / 365);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="card card-shadow relative overflow-hidden p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(15,139,99,0.16),transparent_55%),radial-gradient(circle_at_top_right,rgba(15,108,189,0.12),transparent_46%)]" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_280px]">
        <div>
          <span className="section-label">Capital Account</span>
          <h2 className="mt-4 text-[28px] font-semibold tracking-tight text-curt-text sm:text-[34px]">
            Your money, staged like a premium operating account.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-curt-text-muted sm:text-[15px]">
            The front layer stays calm and legible. Curtis handles the tactical routing, monitoring, and strategy work in the command deck above.
          </p>

          <div className="mt-8">
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-curt-text-muted">Total Balance</p>
            {loading ? (
              <div className="mt-3 h-12 w-56 shimmer rounded-full" />
            ) : (
              <p className="mt-3 font-data text-[42px] font-semibold leading-none tracking-tight text-curt-text sm:text-[52px]">
                {formatUsd(totalBalance)}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {positions.length === 0 ? (
              <button onClick={() => void generateStrategyFromStore(riskProfile)} className="btn-accent px-5 py-3 text-[13px]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Launch allocation plan
              </button>
            ) : (
              <button onClick={() => setDepositOpen(true)} className="btn-accent px-5 py-3 text-[13px]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add capital
              </button>
            )}

            <button
              onClick={positions.length === 0 ? () => setDepositOpen(true) : () => setWithdrawOpen(true)}
              className="btn-secondary px-5 py-3 text-[13px]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              {positions.length === 0 ? "Open deposit modal" : "Withdraw"}
            </button>

            <button onClick={toggleCurtain} className="btn-ghost px-4 py-3 text-[13px] text-curt-text-secondary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pull the curtain
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Blended APY</p>
            {loading ? (
              <div className="mt-3 h-6 w-16 shimmer rounded-full" />
            ) : (
              <p className="mt-3 font-data text-[24px] font-semibold text-curt-accent">{formatApy(blendedApy)}</p>
            )}
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Daily Earnings</p>
            {loading ? (
              <div className="mt-3 h-6 w-24 shimmer rounded-full" />
            ) : (
              <p className="mt-3 font-data text-[24px] font-semibold text-curt-text">
                {dailyEarnings > 0 ? `+${formatUsd(dailyEarnings)}` : formatUsd(0)}
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Live Allocations</p>
            <p className="mt-3 font-data text-[24px] font-semibold text-curt-text">{positions.length}</p>
            <p className="mt-1 text-[12px] text-curt-text-muted">{positions.length === 0 ? "Curtis is standing by." : "Tracked in real time."}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
