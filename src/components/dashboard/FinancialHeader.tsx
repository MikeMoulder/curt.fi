"use client";

import { useStore } from "@/store/useStore";
import { formatUsd, formatApy } from "@/lib/utils";

export default function FinancialHeader() {
  const totalBalance = useStore((s) => s.totalBalance);
  const blendedApy = useStore((s) => s.blendedApy);
  const positions = useStore((s) => s.positions);
  const riskProfile = useStore((s) => s.riskProfile);
  const loading = useStore((s) => s.loading);
  const toggleCurtain = useStore((s) => s.toggleCurtain);

  return (
    <div className="card card-shadow p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="section-label">Portfolio Pulse</span>
          <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-curt-text">Banking calm, technical depth one pull away.</h2>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-curt-text-muted">
            Curtis keeps the surface simple while the curtain view exposes the routing, concentration, and AI reasoning underneath.
          </p>
        </div>

        <button onClick={toggleCurtain} className="btn-secondary px-4 py-2 text-[12px]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Pull the curtain
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Capital</p>
          {loading ? (
            <div className="mt-2 h-7 w-28 shimmer rounded-full" />
          ) : (
            <p className="mt-2 font-data text-xl font-semibold text-curt-text">{formatUsd(totalBalance)}</p>
          )}
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Blended Yield</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 shimmer rounded-full" />
          ) : (
            <p className="mt-2 font-data text-xl font-semibold text-curt-accent">{formatApy(blendedApy)}</p>
          )}
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Live Positions</p>
          <p className="mt-2 font-data text-xl font-semibold text-curt-text">{positions.length}</p>
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Posture</p>
          <p className="mt-2 text-xl font-semibold capitalize text-curt-text">{riskProfile}</p>
        </div>
      </div>
    </div>
  );
}
