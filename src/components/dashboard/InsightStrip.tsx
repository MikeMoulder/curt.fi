"use client";

import { useStore } from "@/store/useStore";
import { executeCurtisAction, generateStrategyFromStore } from "@/lib/ai/curtis-actions";
import { formatApy } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export default function InsightStrip() {
  const positions = useStore((s) => s.positions);
  const blendedApy = useStore((s) => s.blendedApy);
  const vaults = useStore((s) => s.vaults);

  const insight = useMemo(() => {
    if (positions.length === 0) return null;

    // Find best available vault APY vs current
    const bestVault = vaults
      .filter((v) => v.isTransactional && v.analytics.totalApy !== null)
      .sort((a, b) => (b.analytics.totalApy ?? 0) - (a.analytics.totalApy ?? 0))[0];

    const bestApy = bestVault?.analytics.totalApy ?? 0;
    const gap = bestApy - blendedApy;

    if (gap > 1) {
      return {
        type: "opportunity" as const,
        text: `A better opportunity is available (+${gap.toFixed(1)}% APY on ${bestVault.network}).`,
        action: "Generate refreshed plan",
      };
    }

    if (blendedApy > 0) {
      return {
        type: "status" as const,
        text: `Your portfolio is earning ${formatApy(blendedApy)} blended APY across ${positions.length} position${positions.length !== 1 ? "s" : ""}.`,
        action: null,
      };
    }

    return null;
  }, [positions, blendedApy, vaults]);

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className={`card card-shadow flex items-center justify-between gap-4 px-4 py-4 text-[13px] ${
            insight.type === "opportunity"
              ? "text-curt-accent"
              : "text-curt-text-secondary"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`live-dot shrink-0 ${insight.type === "opportunity" ? "bg-curt-accent" : "bg-curt-text-muted"}`} />
              <span>{insight.text}</span>
            </div>
            {insight.action && (
              <button
                onClick={() => {
                  if (insight.type === "opportunity") {
                    void generateStrategyFromStore();
                    return;
                  }

                  void executeCurtisAction({
                    type: "toggle_curtain",
                    label: "Open curtain view",
                    open: true,
                  });
                }}
                className="btn-action shrink-0"
              >
                {insight.action} →
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
