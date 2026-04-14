"use client";

import { useStore } from "@/store/useStore";

export default function SystemSignals() {
  const positions = useStore((s) => s.positions);
  const riskProfile = useStore((s) => s.riskProfile);

  const uniqueChains = new Set(positions.map((p) => p.vault.chainId)).size;
  const uniqueProtocols = new Set(positions.map((p) => p.vault.protocol.name)).size;

  const signals = [
    {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: positions.length > 0 ? "Live vault monitoring is active" : "Curtis is scanning for a first route",
    },
    {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      text: `${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} risk`,
    },
    {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      text:
        positions.length > 0
          ? `${uniqueChains} chain${uniqueChains !== 1 ? "s" : ""}, ${uniqueProtocols} protocol${uniqueProtocols !== 1 ? "s" : ""}`
          : "Watching 672+ vaults across 21 chains",
    },
  ];

  return (
    <div className="card card-shadow p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="section-label">System Signals</span>
          <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-curt-text">The quiet indicators Curtis is watching.</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {signals.map((signal) => (
          <div key={signal.text} className="flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/70 p-3.5 text-[13px] text-curt-text-secondary">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-curt-surface-alt text-curt-text">{signal.icon}</span>
            <span>{signal.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
