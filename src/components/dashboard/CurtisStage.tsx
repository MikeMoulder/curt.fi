"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { generateStrategyFromStore } from "@/lib/ai/curtis-actions";
import { formatApy, formatUsd } from "@/lib/utils";
import type { RiskProfile } from "@/lib/types";
import { useStore } from "@/store/useStore";
import AIFeed from "./AIFeed";

const PROFILE_COPY: Record<RiskProfile, { label: string; body: string }> = {
  safe: {
    label: "Safe",
    body: "Capital preservation first, leaning into deeper liquidity and steadier carry.",
  },
  balanced: {
    label: "Balanced",
    body: "A cleaner spread between yield quality, diversification, and flexibility.",
  },
  aggressive: {
    label: "Aggressive",
    body: "More willing to press into momentum while still keeping the exposure legible.",
  },
};

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-panel p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
        {label}
      </p>
      <p className="mt-3 font-data text-[26px] font-semibold tracking-[-0.06em] text-white sm:text-[30px]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/58">{detail}</p>
    </div>
  );
}

function StrategyDock() {
  const strategy = useStore((state) => state.strategy);
  const positions = useStore((state) => state.positions);
  const blendedApy = useStore((state) => state.blendedApy);
  const riskProfile = useStore((state) => state.riskProfile);
  const vaults = useStore((state) => state.vaults);

  const protocolCount = new Set(
    positions.map((position) => position.vault.protocol.name)
  ).size;
  const chainCount = new Set(positions.map((position) => position.vault.chainId)).size;
  const bestVault = useMemo(
    () =>
      [...vaults]
        .filter((vault) => vault.isTransactional && vault.analytics.totalApy !== null)
        .sort(
          (left, right) =>
            (right.analytics.totalApy ?? 0) - (left.analytics.totalApy ?? 0)
        )[0],
    [vaults]
  );

  if (strategy && strategy.allocations.length > 0) {
    return (
      <div className="metric-panel h-full p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
          Fresh Thesis
        </p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-white">
          Curtis already has a move ready.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/62">{strategy.summary}</p>
        <div className="mt-6 space-y-3">
          {strategy.allocations.slice(0, 3).map((allocation) => (
            <div
              key={`${allocation.vault.address}-${allocation.percentage}`}
              className="rounded-[22px] border border-white/10 bg-white/6 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-white">
                    {allocation.vault.protocol.name}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/42">
                    {allocation.vault.network}
                  </p>
                </div>
                <span className="font-data text-sm font-semibold text-emerald-300">
                  {allocation.percentage}%
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/58">
                {allocation.reasoning}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (positions.length > 0) {
    const opportunityGap = bestVault?.analytics.totalApy
      ? bestVault.analytics.totalApy - blendedApy
      : null;

    return (
      <div className="metric-panel h-full p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
          Live Watchlist
        </p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-white">
          What Curtis is watching now.
        </h2>
        <div className="mt-6 space-y-3">
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">
              Opportunity Gap
            </p>
            <p className="mt-2 font-data text-[22px] font-semibold tracking-[-0.05em] text-white">
              {opportunityGap && opportunityGap > 0
                ? `+${opportunityGap.toFixed(2)}%`
                : "Tight spread"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {bestVault
                ? `Top live vault is ${bestVault.protocol.name} on ${bestVault.network} at ${formatApy(
                    bestVault.analytics.totalApy
                  )}.`
                : "Curtis is waiting on the live vault scan to rank the field."}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">
              Diversification
            </p>
            <p className="mt-2 font-data text-[22px] font-semibold tracking-[-0.05em] text-white">
              {chainCount} chains / {protocolCount} protocols
            </p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Enough spread to stay resilient, with Curtis still scanning for cleaner placements whenever the field moves.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">
              Current Posture
            </p>
            <p className="mt-2 font-data text-[22px] font-semibold tracking-[-0.05em] text-white">
              {PROFILE_COPY[riskProfile].label}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {PROFILE_COPY[riskProfile].body}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-panel h-full p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
        Opening Move
      </p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-white">
        Pick the capital posture you want.
      </h2>
      <p className="mt-3 text-sm leading-7 text-white/62">
        Curtis can draft from any of these starting points, then open the technical layer when you want to inspect the actual routing logic.
      </p>
      <div className="mt-6 space-y-3">
        {(Object.keys(PROFILE_COPY) as RiskProfile[]).map((profile) => {
          const active = profile === riskProfile;

          return (
            <div
              key={profile}
              className={`rounded-[22px] border p-4 ${
                active
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/6"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-[15px] font-semibold text-white">
                  {PROFILE_COPY[profile].label}
                </p>
                {active ? (
                  <span className="text-xs uppercase tracking-[0.16em] text-emerald-300">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-white/58">
                {PROFILE_COPY[profile].body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CurtisStage() {
  const positions = useStore((state) => state.positions);
  const vaults = useStore((state) => state.vaults);
  const totalBalance = useStore((state) => state.totalBalance);
  const blendedApy = useStore((state) => state.blendedApy);
  const riskProfile = useStore((state) => state.riskProfile);
  const strategy = useStore((state) => state.strategy);
  const loading = useStore((state) => state.loading);
  const toggleCurtain = useStore((state) => state.toggleCurtain);

  const [isGenerating, setIsGenerating] = useState(false);

  const bestVault = useMemo(
    () =>
      [...vaults]
        .filter((vault) => vault.isTransactional && vault.analytics.totalApy !== null)
        .sort(
          (left, right) =>
            (right.analytics.totalApy ?? 0) - (left.analytics.totalApy ?? 0)
        )[0],
    [vaults]
  );

  const stageTitle = positions.length
    ? "Curtis is steering your capital in real time."
    : "Curtis is ready to build your first allocation.";

  const stageBody = positions.length
    ? "He watches the yield field, the concentration risk, and the better route before you have to ask. The rest of the dashboard should support that read, not compete with it."
    : "Pick a posture, let him score the live field, and keep the full technical layer one pull away whenever you want to inspect the machinery underneath.";

  async function handleGenerate(profile?: RiskProfile) {
    setIsGenerating(true);
    try {
      await generateStrategyFromStore(profile ?? riskProfile);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="curtis-hero-panel px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10"
    >
      <div className="relative z-10 grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-center">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="stage-chip">
              <span className="live-dot bg-emerald-300" />
              Curtis live
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">
              {positions.length
                ? `${positions.length} live positions under watch`
                : `${(vaults.length || 672).toLocaleString()} vault opportunities on deck`}
            </span>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-[clamp(2.4rem,5vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.07em] text-white">
              {stageTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/66 sm:text-[17px] sm:leading-8">
              {stageBody}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="stage-cta disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isGenerating
                ? "Reframing Curtis"
                : strategy
                  ? "Refresh Curtis thesis"
                  : "Generate Curtis strategy"}
            </button>
            <button onClick={toggleCurtain} className="stage-ghost">
              Pull the curtain
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(PROFILE_COPY) as RiskProfile[]).map((profile) => {
              const active = profile === riskProfile;

              return (
                <button
                  key={profile}
                  onClick={() => handleGenerate(profile)}
                  disabled={isGenerating}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    active
                      ? "bg-white text-curt-text"
                      : "border border-white/12 bg-white/6 text-white/72 backdrop-blur"
                  }`}
                >
                  {PROFILE_COPY[profile].label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label="Capital under guidance"
              value={loading ? "Loading" : formatUsd(totalBalance)}
              detail={
                positions.length
                  ? `${positions.length} placements live now`
                  : "Ready for the first allocation"
              }
            />
            <MetricTile
              label="Current blend"
              value={
                positions.length
                  ? formatApy(blendedApy)
                  : formatApy(bestVault?.analytics.totalApy ?? null)
              }
              detail={
                positions.length
                  ? "Weighted from active positions"
                  : "Best live opportunity Curtis sees"
              }
            />
            <MetricTile
              label="Curtis posture"
              value={PROFILE_COPY[riskProfile].label}
              detail={
                strategy
                  ? `${strategy.allocations.length} allocations already mapped`
                  : PROFILE_COPY[riskProfile].body
              }
            />
          </div>
        </div>

        <div className="relative flex min-h-[320px] items-center justify-center">
          <div className="absolute left-0 top-5 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/68 backdrop-blur">
            21 chains in play
          </div>
          <div className="absolute bottom-6 left-2 rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">
              Live scan
            </p>
            <p className="mt-2 font-data text-lg font-semibold tracking-[-0.05em] text-white">
              {bestVault ? formatApy(bestVault.analytics.totalApy) : "672+ vaults"}
            </p>
          </div>
          <div className="absolute bottom-14 right-0 rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">
              Current posture
            </p>
            <p className="mt-2 font-data text-lg font-semibold tracking-[-0.05em] text-white">
              {PROFILE_COPY[riskProfile].label}
            </p>
          </div>

          <div className="curtis-stage">
            <div className="curtis-stage__ring curtis-stage__ring--one" />
            <div className="curtis-stage__ring curtis-stage__ring--two" />
            <div className="curtis-stage__ring curtis-stage__ring--three" />
            <div className="curtis-stage__core px-6">
              <span className="stage-chip">AI portfolio agent</span>
              <p className="mt-5 text-[44px] font-semibold tracking-[-0.08em] text-white sm:text-[56px]">
                Curtis
              </p>
              <p className="mt-3 max-w-[230px] text-sm leading-6 text-white/58">
                Scanning {(vaults.length || 672).toLocaleString()} live vaults and turning complexity into a single next move.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-10 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <StrategyDock />

        <div className="curtis-console">
          <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-curt-text-muted">
                Curtis channel
              </p>
              <p className="mt-1 text-sm text-curt-text-secondary">
                Ask for a safer posture, a better yield route, or the plain-English reason behind any move.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-black/8 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-curt-text-muted">
              <span className="live-dot bg-curt-accent" />
              Conversation live
            </span>
          </div>
          <div className="flex min-h-[460px] flex-1 flex-col p-4 sm:p-5">
            <AIFeed />
          </div>
        </div>
      </div>
    </motion.section>
  );
}