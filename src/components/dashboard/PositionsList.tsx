"use client";

import { useStore } from "@/store/useStore";
import { formatUsd, formatApy, chainName, chainColor } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PositionsList() {
  const positions = useStore((s) => s.positions);
  const totalBalance = useStore((s) => s.totalBalance);
  const setWithdrawOpen = useStore((s) => s.setWithdrawOpen);
  const setWithdrawVaultAddress = useStore((s) => s.setWithdrawVaultAddress);
  const setDepositOpen = useStore((s) => s.setDepositOpen);
  const toggleCurtain = useStore((s) => s.toggleCurtain);

  function handleWithdraw(vaultAddress: string) {
    setWithdrawVaultAddress(vaultAddress);
    setWithdrawOpen(true);
  }

  if (positions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="card card-shadow p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="section-label">Active Positions</span>
            <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-curt-text">
              Curtis hasn&apos;t deployed capital yet.
            </h3>
          </div>
          <button onClick={toggleCurtain} className="btn-ghost text-[12px]">
            Pull the curtain
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-dashed border-curt-border bg-white/58 px-5 py-8 text-center backdrop-blur">
          <p className="text-[14px] leading-relaxed text-curt-text-secondary">
            Make a first deposit or ask Curtis for a launch plan. This ledger will populate once capital is routed into live positions.
          </p>
          <button onClick={() => setDepositOpen(true)} className="btn-accent mt-5 px-5 py-2.5 text-[13px]">
            Make first deposit
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="card card-shadow p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="section-label">Active Positions</span>
          <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-curt-text">
            Capital deployed across the field.
          </h3>
        </div>
        <button onClick={toggleCurtain} className="btn-ghost text-[12px]">
          Pull the curtain
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {positions.map((p, i) => {
          const bal = parseFloat(p.balanceUsd || "0");
          const share = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;

          return (
            <div
              key={`${p.vault.address}-${i}`}
              className="rounded-[24px] border border-white/70 bg-white/62 px-4 py-4 backdrop-blur transition hover:border-curt-border hover:bg-white/84 sm:px-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: chainColor(p.vault.chainId) }} />
                    <p className="text-[15px] font-semibold text-curt-text">
                      {p.vault.protocol.name}
                    </p>
                    <span className="rounded-full bg-curt-surface-alt px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-curt-text-muted">
                      {chainName(p.vault.chainId)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-curt-text-secondary">
                    {p.vault.tokens.map((t) => t.symbol).join(" / ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="rounded-full border border-curt-accent/16 bg-curt-accent-light px-3 py-2 text-[12px] font-semibold text-curt-accent">
                    {formatApy(p.vault.analytics.totalApy)} live
                  </div>
                  <div className="min-w-[124px] text-left lg:text-right">
                    <p className="font-data text-[16px] font-semibold text-curt-text">{formatUsd(bal)}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-curt-text-muted">
                      {share.toFixed(1)}% of portfolio
                    </p>
                </div>
                  <button
                    onClick={() => handleWithdraw(p.vault.address)}
                    className="btn-ghost px-3 py-2 text-[12px]"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
