"use client";

import { useStore } from "@/store/useStore";
import { formatUsd, formatApy, chainName, chainColor } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ── Diversification bar ── */
function DiversificationBar({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  return (
    <div className="space-y-2.5">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="h-full transition-all duration-500"
            style={{ width: `${Math.max(seg.pct, 2)}%`, background: seg.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-[11px] text-curtain-text-muted">{seg.label}</span>
            <span className="text-[11px] font-data text-curtain-text">{seg.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CurtainOverlay() {
  const curtainOpen = useStore((s) => s.curtainOpen);
  const toggleCurtain = useStore((s) => s.toggleCurtain);
  const positions = useStore((s) => s.positions);
  const totalBalance = useStore((s) => s.totalBalance);
  const blendedApy = useStore((s) => s.blendedApy);
  const strategy = useStore((s) => s.strategy);
  const riskProfile = useStore((s) => s.riskProfile);
  const setWithdrawOpen = useStore((s) => s.setWithdrawOpen);
  const setWithdrawVaultAddress = useStore((s) => s.setWithdrawVaultAddress);

  // Chain diversification
  const chainBreakdown = positions.reduce<Record<number, number>>((acc, p) => {
    const bal = parseFloat(p.balanceUsd || "0");
    acc[p.vault.chainId] = (acc[p.vault.chainId] || 0) + bal;
    return acc;
  }, {});
  const chainSegments = Object.entries(chainBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([id, bal]) => ({
      label: chainName(Number(id)),
      pct: totalBalance > 0 ? (bal / totalBalance) * 100 : 0,
      color: chainColor(Number(id)),
    }));

  // Protocol diversification
  const protocolBreakdown = positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.vault.protocol.name] = (acc[p.vault.protocol.name] || 0) + parseFloat(p.balanceUsd || "0");
    return acc;
  }, {});
  const protocolColors = ["#6D28D9", "#059669", "#2563EB", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
  const protocolSegments = Object.entries(protocolBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([name, bal], i) => ({
      label: name,
      pct: totalBalance > 0 ? (bal / totalBalance) * 100 : 0,
      color: protocolColors[i % protocolColors.length],
    }));

  function handleWithdraw(vaultAddress: string) {
    setWithdrawVaultAddress(vaultAddress);
    setWithdrawOpen(true);
  }

  return (
    <AnimatePresence>
      {curtainOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 overflow-y-auto"
          style={{ background: "var(--color-curtain-bg)" }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "rgba(12,15,26,0.92)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-curt-violet live-dot" />
              <span className="text-[13px] font-medium text-curtain-text">System Transparency</span>
            </div>
            <button onClick={toggleCurtain} className="flex items-center gap-1.5 text-[13px] text-curtain-text-muted hover:text-curtain-text transition-colors cursor-pointer">
              Close
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
            {/* Overview metrics */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {[
                { label: "Total Value", value: formatUsd(totalBalance), accent: false },
                { label: "Blended APY", value: formatApy(blendedApy), accent: true },
                { label: "Positions", value: String(positions.length), accent: false },
                { label: "Risk Profile", value: riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1), accent: false },
              ].map((m) => (
                <div key={m.label} className="curtain-card p-4">
                  <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-1">{m.label}</p>
                  <p className={`font-data text-lg font-semibold ${m.accent ? "text-emerald-400" : "text-curtain-text"}`}>{m.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Allocation map */}
            {positions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="curtain-card p-5"
              >
                <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-4">Allocation Map</p>

                {/* Treemap-style grid */}
                <div className="grid gap-1 mb-5" style={{
                  gridTemplateColumns: positions.length <= 2
                    ? `repeat(${positions.length}, 1fr)`
                    : positions.length <= 4
                      ? "repeat(2, 1fr)"
                      : "repeat(3, 1fr)"
                }}>
                  {positions.map((p, i) => {
                    const bal = parseFloat(p.balanceUsd || "0");
                    const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                    return (
                      <div
                        key={`${p.vault.address}-${i}`}
                        className="relative rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: chainColor(p.vault.chainId) + "18", borderLeft: `2px solid ${chainColor(p.vault.chainId)}` }}
                        onClick={() => handleWithdraw(p.vault.address)}
                      >
                        <p className="text-[12px] font-medium text-curtain-text">{p.vault.protocol.name}</p>
                        <p className="text-[10px] text-curtain-text-muted">
                          {p.vault.tokens.map((t) => t.symbol).join("/")} · {chainName(p.vault.chainId)}
                        </p>
                        <div className="mt-2 flex items-baseline gap-3">
                          <span className="font-data text-[14px] font-semibold text-curtain-text">{formatUsd(bal)}</span>
                          <span className="font-data text-[11px] text-emerald-400">{formatApy(p.vault.analytics.totalApy)}</span>
                          <span className="font-data text-[10px] text-curtain-text-muted">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Diversification bars */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-2">By Chain</p>
                    <DiversificationBar segments={chainSegments} />
                  </div>
                  <div>
                    <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-2">By Protocol</p>
                    <DiversificationBar segments={protocolSegments} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Strategy reasoning */}
            {strategy && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="curtain-card p-5"
              >
                <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-3">Curtis Strategy Reasoning</p>
                <p className="text-[13px] text-curtain-text leading-relaxed mb-4">{strategy.summary}</p>

                <div className="flex gap-4 mb-4">
                  <div className="curtain-card p-3 flex-1">
                    <p className="text-[10px] text-curtain-text-muted mb-0.5">Target APY</p>
                    <p className="font-data text-lg font-semibold text-emerald-400">{formatApy(strategy.blendedApy)}</p>
                  </div>
                  <div className="curtain-card p-3 flex-1">
                    <p className="text-[10px] text-curtain-text-muted mb-0.5">Risk Score</p>
                    <p className="text-[14px] font-semibold text-curtain-text">{strategy.riskScore}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {strategy.allocations.map((alloc, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-curtain-border last:border-0">
                      <span className="font-data text-[13px] font-semibold text-emerald-400 w-10 text-right shrink-0">{alloc.percentage}%</span>
                      <div>
                        <p className="text-[13px] font-medium text-curtain-text">
                          {alloc.vault.protocol.name}
                          <span className="text-curtain-text-muted font-normal ml-1.5 text-[11px]">{chainName(alloc.vault.chainId)}</span>
                        </p>
                        <p className="text-[11px] text-curtain-text-muted mt-0.5 leading-relaxed">{alloc.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Execution log placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="curtain-card p-5"
            >
              <p className="text-[10px] text-curtain-text-muted uppercase tracking-wider font-medium mb-3">Execution Log</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-curtain-text-muted">Portfolio analysis completed</span>
                  <span className="text-curtain-text-muted ml-auto font-data text-[10px]">Just now</span>
                </div>
                {positions.length > 0 && (
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-curtain-text-muted">{positions.length} active position{positions.length !== 1 ? "s" : ""} monitored</span>
                    <span className="text-curtain-text-muted ml-auto font-data text-[10px]">Active</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-curt-violet shrink-0" />
                  <span className="text-curtain-text-muted">Vault scanning across 21 chains</span>
                  <span className="text-curtain-text-muted ml-auto font-data text-[10px]">Continuous</span>
                </div>
              </div>
            </motion.div>

            {/* Curtis note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-start gap-3 px-1 pb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-curt-violet mt-1.5 shrink-0 live-dot" />
              <p className="text-[12px] text-curtain-text-muted leading-relaxed">
                Curtis continuously monitors vault performance, TVL shifts, and APY trends. When conditions change, you&apos;ll see proactive recommendations. All decisions are yours to accept or dismiss.
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
