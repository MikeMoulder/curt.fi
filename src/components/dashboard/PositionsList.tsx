"use client";

import { useStore } from "@/store/useStore";
import { formatUsd, formatApy, chainName, chainColor } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PositionsList() {
  const positions = useStore((s) => s.positions);
  const setWithdrawOpen = useStore((s) => s.setWithdrawOpen);
  const setWithdrawVaultAddress = useStore((s) => s.setWithdrawVaultAddress);
  const toggleCurtain = useStore((s) => s.toggleCurtain);

  if (positions.length === 0) return null;

  function handleWithdraw(vaultAddress: string) {
    setWithdrawVaultAddress(vaultAddress);
    setWithdrawOpen(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="card card-shadow"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-curt-border">
        <p className="text-[12px] text-curt-text-muted font-medium uppercase tracking-wider">Active Positions</p>
        <button onClick={toggleCurtain} className="btn-ghost text-[12px]">
          Pull the curtain
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <div className="divide-y divide-curt-border">
        {positions.map((p, i) => {
          const bal = parseFloat(p.balanceUsd || "0");
          return (
            <div key={`${p.vault.address}-${i}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-curt-surface-alt transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: chainColor(p.vault.chainId) }} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-curt-text truncate">
                    {p.vault.protocol.name}
                    <span className="text-curt-text-muted font-normal ml-1.5 text-[12px]">
                      {p.vault.tokens.map((t) => t.symbol).join(" / ")}
                    </span>
                  </p>
                  <p className="text-[11px] text-curt-text-muted">{chainName(p.vault.chainId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="font-data text-[14px] font-semibold text-curt-text">{formatUsd(bal)}</p>
                  <p className="font-data text-[11px] text-curt-accent">{formatApy(p.vault.analytics.totalApy)}</p>
                </div>
                <button
                  onClick={() => handleWithdraw(p.vault.address)}
                  className="btn-ghost text-[12px] px-2 py-1"
                >
                  Withdraw
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
