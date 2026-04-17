"use client";

import type { VaultComparisonItem } from "@/lib/types";
import { executeCurtisAction } from "@/lib/ai/curtis-actions";
import { motion } from "framer-motion";

function formatUsd(value: string | number | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!num || !Number.isFinite(num)) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatApy(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)}%`;
}

function TrendArrow({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return <span className="text-curt-text-muted text-[10px]">→</span>;
  if (diff > 0) return <span className="text-curt-accent text-[10px]">↑</span>;
  return <span className="text-curt-danger text-[10px]">↓</span>;
}

export default function VaultComparison({ vaults }: { vaults: VaultComparisonItem[] }) {
  if (!vaults || vaults.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(vaults.length, 3)}, 1fr)` }}
    >
      {vaults.map((vault) => (
        <div
          key={`${vault.vaultAddress}-${vault.chainId}`}
          className={`relative rounded-[20px] border p-4 transition-all ${
            vault.recommended
              ? "border-curt-accent/40 bg-curt-accent-light shadow-[0_4px_16px_rgba(15,139,99,0.08)]"
              : "border-white/70 bg-white/70"
          }`}
        >
          {vault.recommended && (
            <span className="absolute -top-2.5 left-3 rounded-full bg-curt-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
              Best fit
            </span>
          )}

          <div className="mt-1">
            <p className="text-[13px] font-semibold text-curt-text">{vault.protocol}</p>
            <p className="text-[11px] text-curt-text-muted">{vault.chain} · {vault.tokens.join("/")}</p>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-curt-text-muted">APY</span>
              <span className="font-data text-[15px] font-semibold text-curt-accent">{formatApy(vault.apy)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-curt-text-muted">7d trend</span>
              <span className="flex items-center gap-1 font-data text-[12px] text-curt-text-secondary">
                {formatApy(vault.apy7d)} <TrendArrow current={vault.apy7d} previous={vault.apy30d} />
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-curt-text-muted">TVL</span>
              <span className="font-data text-[12px] text-curt-text-secondary">{formatUsd(vault.tvlUsd)}</span>
            </div>
          </div>

          {vault.reasoning && (
            <p className="mt-3 text-[11px] leading-relaxed text-curt-text-muted">{vault.reasoning}</p>
          )}

          <button
            onClick={() => void executeCurtisAction({
              type: "open_deposit",
              label: `Deposit into ${vault.protocol}`,
              vaultAddress: vault.vaultAddress,
              chainId: vault.chainId,
            })}
            className={`mt-3 w-full rounded-xl py-2 text-[12px] font-medium transition-colors ${
              vault.recommended
                ? "bg-curt-accent text-white hover:bg-curt-accent/90"
                : "bg-curt-text/5 text-curt-text hover:bg-curt-text/10"
            }`}
          >
            Deposit into this
          </button>
        </div>
      ))}
    </motion.div>
  );
}
