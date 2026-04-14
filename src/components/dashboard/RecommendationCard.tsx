"use client";

import { useStore } from "@/store/useStore";
import { executeCurtisAction, generateStrategyFromStore } from "@/lib/ai/curtis-actions";
import type { CurtisAction } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function RecommendationCard() {
  const strategy = useStore((s) => s.strategy);
  const positions = useStore((s) => s.positions);
  const riskProfile = useStore((s) => s.riskProfile);

  const topAlloc = strategy?.allocations[0];

  function handleAccept() {
    if (!topAlloc) return;
    const action: CurtisAction = {
      type: "open_deposit",
      label: "Deposit",
      vaultAddress: topAlloc.vault.address,
      chainId: topAlloc.vault.chainId,
    };
    executeCurtisAction(action);
  }

  function handleDismiss() {
    useStore.getState().setStrategy(null);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="card card-shadow p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="badge badge-ai">
            <span className="w-1.5 h-1.5 rounded-full bg-curt-violet live-dot" />
            Curtis
          </span>
          <span className="badge badge-action">Recommendation Engine</span>
        </div>

        {!strategy || !topAlloc ? (
          <>
            <h3 className="text-[20px] font-semibold tracking-tight text-curt-text">Curtis can surface the next move instead of waiting in the margins.</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-curt-text-muted">
              {positions.length === 0
                ? "Start with a strategy draft and Curtis will translate your posture into a first allocation plan."
                : "No fresh rebalance is staged yet. Ask Curtis for a safer, higher-yield, or more diversified plan and he’ll turn it into a live recommendation."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => void generateStrategyFromStore(riskProfile)} className="btn-action">
                Generate {riskProfile} plan
              </button>
              <button onClick={() => void generateStrategyFromStore("safe")} className="btn-ghost text-[13px]">
                Safer draft
              </button>
              <button onClick={() => void generateStrategyFromStore("aggressive")} className="btn-ghost text-[13px]">
                Higher-yield draft
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-[20px] font-semibold tracking-tight text-curt-text">Curtis wants to route fresh capital toward {topAlloc.vault.protocol.name}.</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-curt-text-muted">{strategy.summary}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {strategy.allocations.slice(0, 3).map((alloc, index) => (
                <div key={index} className="rounded-[22px] border border-white/70 bg-white/70 p-3">
                  <p className="font-data text-[18px] font-semibold text-curt-accent">{alloc.percentage}%</p>
                  <p className="mt-1 text-[13px] font-medium text-curt-text">{alloc.vault.protocol.name}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-curt-text-muted">{alloc.reasoning}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-curt-border pt-4">
              <button onClick={handleAccept} className="btn-action">
                Deposit into top pick
              </button>
              <button onClick={() => void generateStrategyFromStore(riskProfile)} className="btn-ghost text-[13px]">
                Regenerate
              </button>
              <button onClick={handleDismiss} className="btn-ghost text-[13px]">Dismiss</button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
