"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { generateStrategyFromStore, executeCurtisAction } from "@/lib/ai/curtis-actions";
import { fetchCurtisReply } from "@/lib/ai/curtis-client";
import { formatApy, formatUsd } from "@/lib/utils";
import type { CurtisAction, ChatMessage, RiskProfile } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

const PROMPTS_WITH_POSITIONS = [
  "Make this portfolio safer without killing yield.",
  "Where is the best move for fresh capital right now?",
  "Explain why my current allocations make sense.",
  "Show me the most aggressive rebalance you'd actually trust.",
];

const PROMPTS_EMPTY = [
  "Build me a balanced starter allocation.",
  "Where should I park stablecoins first?",
  "Give me the safest route to 6-8% APY.",
  "Show me the highest-quality yield on the board.",
];

const RISK_PROFILES: RiskProfile[] = ["safe", "balanced", "aggressive"];

function ActionIcon({ type }: { type: CurtisAction["type"] }) {
  switch (type) {
    case "open_deposit":
      return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    case "open_withdraw":
      return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" /></svg>;
    case "generate_strategy":
      return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;
    case "toggle_curtain":
      return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /></svg>;
    default:
      return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
  }
}

function splitMessage(content: string) {
  const match = content.match(/^[^.!?]+[.!?]/);

  if (!match) {
    return { headline: content, detail: "" };
  }

  return {
    headline: match[0].trim(),
    detail: content.slice(match[0].length).trim(),
  };
}

function AssistantMessage({ msg, isLatest }: { msg: ChatMessage; isLatest: boolean }) {
  const { headline, detail } = splitMessage(msg.content);

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] border border-white/70 bg-white/76 p-5 shadow-[0_18px_40px_rgba(16,28,24,0.06)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="badge badge-ai">
          <span className="h-1.5 w-1.5 rounded-full bg-curt-violet live-dot" />
          Curtis Brief
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Live intelligence</span>
      </div>

      <p className="mt-4 text-[17px] font-semibold leading-snug text-curt-text">{headline}</p>
      {detail && <p className="mt-2 text-[14px] leading-relaxed text-curt-text-secondary">{detail}</p>}

      {msg.actions && msg.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-curt-border pt-4">
          {msg.actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              onClick={() => void executeCurtisAction(action)}
              className="btn-action"
            >
              <ActionIcon type={action.type} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function UserMessage({ msg, isLatest }: { msg: ChatMessage; isLatest: boolean }) {
  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-[24px] rounded-br-[10px] bg-curt-text px-4 py-3 text-white shadow-[0_16px_32px_rgba(16,28,24,0.18)]">
        <p className="text-[13px] leading-relaxed">{msg.content}</p>
      </div>
    </motion.div>
  );
}

function ThinkingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/70 bg-white/76 p-5"
    >
      <div className="flex items-center gap-3">
        <span className="badge badge-ai">
          <span className="h-1.5 w-1.5 rounded-full bg-curt-violet pulse-dot" />
          Curtis
        </span>
        <span className="text-[13px] text-curt-text-muted">Scanning vault quality, concentration, and yield momentum.</span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 w-40 shimmer rounded-full" />
        <div className="h-3 w-full shimmer rounded-full" />
        <div className="h-3 w-3/4 shimmer rounded-full" />
      </div>
    </motion.div>
  );
}

function CurtisStage({
  loading,
  blendedApy,
  positionsCount,
  riskProfile,
}: {
  loading: boolean;
  blendedApy: number;
  positionsCount: number;
  riskProfile: RiskProfile;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,249,241,0.72))] p-5 shadow-[0_24px_50px_rgba(16,28,24,0.08)]">
      <div className="command-grid" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_22%,rgba(15,139,99,0.18),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(15,108,189,0.18),transparent_36%)]" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="soft-pill">
          <span className="h-2 w-2 rounded-full bg-curt-accent live-dot" />
          Curtis presence
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Live operator</span>
      </div>

      <div className="relative mt-6">
        <div className="curtis-stage">
          <div className="curtis-stage__ring curtis-stage__ring--one" />
          <div className="curtis-stage__ring curtis-stage__ring--two" />
          <div className="curtis-stage__ring curtis-stage__ring--three" />
          <div className="curtis-stage__core">
            <span className="relative z-10 text-[10px] uppercase tracking-[0.28em] text-curt-text-muted">Curtis</span>
            <span className="relative z-10 mt-2 text-[28px] font-semibold tracking-tight text-curt-text">
              {loading ? "..." : formatApy(blendedApy)}
            </span>
            <span className="relative z-10 mt-1 text-[12px] text-curt-text-secondary">blended target view</span>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <div className="rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Markets</p>
          <p className="mt-2 font-data text-[16px] font-semibold text-curt-text">672+</p>
        </div>
        <div className="rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Live Positions</p>
          <p className="mt-2 font-data text-[16px] font-semibold text-curt-text">{positionsCount}</p>
        </div>
        <div className="rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Posture</p>
          <p className="mt-2 text-[16px] font-semibold capitalize text-curt-text">{riskProfile}</p>
        </div>
      </div>
    </div>
  );
}

export default function CurtisChat() {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const totalBalance = useStore((s) => s.totalBalance);
  const blendedApy = useStore((s) => s.blendedApy);
  const riskProfile = useStore((s) => s.riskProfile);
  const strategy = useStore((s) => s.strategy);
  const loading = useStore((s) => s.loading);
  const chatMessages = useStore((s) => s.chatMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChat = useStore((s) => s.clearChat);
  const positions = useStore((s) => s.positions);
  const vaults = useStore((s) => s.vaults);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topAllocation = strategy?.allocations[0];
  const hasPositions = positions.length > 0;
  const prompts = hasPositions ? PROMPTS_WITH_POSITIONS : PROMPTS_EMPTY;
  const latestAssistantMessage = [...chatMessages].reverse().find((msg) => msg.role === "assistant");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages.length, thinking]);

  useEffect(() => {
    if (chatMessages.length > 0 || loading || vaults.length === 0) {
      return;
    }

    if (!hasPositions) {
      addChatMessage({
        role: "assistant",
        content:
          "I am live across 21 chains and 672+ vaults. Give me a posture and I will sketch a first allocation before you move a dollar.",
        actions: [
          { type: "generate_strategy", label: "Generate balanced plan", riskProfile: "balanced" },
          { type: "generate_strategy", label: "Generate safe plan", riskProfile: "safe" },
        ],
      });
      return;
    }

    addChatMessage({
      role: "assistant",
      content: `I am watching ${positions.length} live position${positions.length === 1 ? "" : "s"} totaling ${formatUsd(totalBalance)} at ${formatApy(blendedApy)} blended APY. Ask me to de-risk, push yield harder, or explain exactly why the current routing works.`,
      actions: [
        { type: "generate_strategy", label: "Refresh strategy" },
        { type: "toggle_curtain", label: "Open curtain view", open: true },
      ],
    });
  }, [addChatMessage, blendedApy, chatMessages.length, hasPositions, loading, positions.length, totalBalance, vaults.length]);

  async function handleSend(text?: string) {
    const query = (text ?? input).trim();
    if (!query || thinking) return;

    setInput("");
    addChatMessage({ role: "user", content: query });
    setThinking(true);

    try {
      const nextHistory: ChatMessage[] = [...chatMessages, { role: "user", content: query }];
      const reply = await fetchCurtisReply(query, positions, vaults, nextHistory);
      addChatMessage({ role: "assistant", content: reply.message, actions: reply.actions });
    } catch {
      addChatMessage({ role: "assistant", content: "I couldn't process that right now. Please try again." });
    } finally {
      setThinking(false);
    }
  }

  async function handleGenerate(profile?: RiskProfile) {
    if (thinking) return;

    setThinking(true);

    try {
      const result = await generateStrategyFromStore(profile);

      if (!result.ok) {
        addChatMessage({ role: "assistant", content: result.error });
        return;
      }

      const leadingAllocation = result.strategy.allocations[0];

      addChatMessage({
        role: "assistant",
        content: leadingAllocation
          ? `${result.strategy.summary} The lead move is ${leadingAllocation.percentage}% into ${leadingAllocation.vault.protocol.name} on ${leadingAllocation.vault.network}.`
          : result.strategy.summary,
        actions: leadingAllocation
          ? [
              {
                type: "open_deposit",
                label: `Review ${leadingAllocation.vault.protocol.name}`,
                vaultAddress: leadingAllocation.vault.address,
                chainId: leadingAllocation.vault.chainId,
              },
              {
                type: "toggle_curtain",
                label: "Open curtain view",
                open: true,
              },
            ]
          : undefined,
      });
    } finally {
      setThinking(false);
    }
  }

  return (
    <section className="command-panel relative overflow-hidden">
      <div className="command-grid" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(15,139,99,0.18),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(15,108,189,0.16),transparent_26%),radial-gradient(circle_at_72%_82%,rgba(178,111,23,0.1),transparent_26%)]" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_390px] xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge badge-ai">
                <span className="h-1.5 w-1.5 rounded-full bg-curt-violet live-dot" />
                Curtis command deck
              </span>
              <span className="soft-pill">Not a side widget. A live portfolio operator.</span>
            </div>

            <h1 className="mt-6 max-w-4xl text-[36px] font-semibold tracking-tight text-curt-text sm:text-[48px] lg:text-[58px] lg:leading-[1.02]">
              Curtis now owns the room instead of hiding in a floating corner.
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-curt-text-secondary sm:text-[17px]">
              He is the strategic layer of the product, so the interface treats him like one: visible, proactive, and wired directly into the capital, posture, and routing decisions happening live.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Capital routed</p>
                {loading ? (
                  <div className="mt-3 h-6 w-24 shimmer rounded-full" />
                ) : (
                  <p className="mt-3 font-data text-[24px] font-semibold text-curt-text">{formatUsd(totalBalance)}</p>
                )}
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Observed yield</p>
                {loading ? (
                  <div className="mt-3 h-6 w-16 shimmer rounded-full" />
                ) : (
                  <p className="mt-3 font-data text-[24px] font-semibold text-curt-accent">{formatApy(blendedApy)}</p>
                )}
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Current posture</p>
                <p className="mt-3 text-[24px] font-semibold capitalize text-curt-text">{riskProfile}</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => void handleGenerate()} className="btn-primary px-5 py-3 text-[13px]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate strategy
              </button>

              <button onClick={() => void handleSend(hasPositions ? "Explain my current allocations in plain English." : "Where should I start with a first deposit?")} className="btn-secondary px-5 py-3 text-[13px]">
                Get Curtis brief
              </button>

              <button
                onClick={() => void executeCurtisAction({ type: "toggle_curtain", label: "Open curtain view", open: true })}
                className="btn-ghost px-4 py-3 text-[13px] text-curt-text-secondary"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open curtain view
              </button>
            </div>

            <div className="mt-7 rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_20px_44px_rgba(16,28,24,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="section-label">Tune posture</span>
                  <p className="mt-3 text-[15px] leading-relaxed text-curt-text-secondary">
                    Shift the operating mode and Curtis will recast the allocation with that mandate in mind.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RISK_PROFILES.map((profile) => (
                    <button
                      key={profile}
                      onClick={() => void handleGenerate(profile)}
                      className={`chip ${riskProfile === profile ? "chip-active" : ""}`}
                    >
                      {profile}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/70 bg-white/72 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Curtis brief</p>
                <p className="mt-3 text-[15px] leading-relaxed text-curt-text">
                  {latestAssistantMessage?.content ?? "Curtis is loading the latest market state before surfacing the first brief."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CurtisStage
              loading={loading}
              blendedApy={blendedApy}
              positionsCount={positions.length}
              riskProfile={riskProfile}
            />

            <div className="rounded-[30px] bg-curt-text p-5 text-white shadow-[0_26px_56px_rgba(16,28,24,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <span className="badge bg-white/10 text-white">Current directive</span>
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/60">Active</span>
              </div>

              <h2 className="mt-4 text-[24px] font-semibold tracking-tight">
                {topAllocation
                  ? `${topAllocation.percentage}% to ${topAllocation.vault.protocol.name}`
                  : hasPositions
                    ? "Ask for the next rebalance"
                    : "Build the first allocation"}
              </h2>

              <p className="mt-3 text-[14px] leading-relaxed text-white/72">
                {topAllocation
                  ? topAllocation.reasoning
                  : hasPositions
                    ? "Curtis already sees the portfolio. Push him toward safer exposure, higher yield, or a clearer explanation of the current wiring."
                    : "Give Curtis a risk posture and he will turn that into a concrete starter plan before you deposit."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {topAllocation ? (
                  <button
                    onClick={() => void executeCurtisAction({
                      type: "open_deposit",
                      label: `Review ${topAllocation.vault.protocol.name}`,
                      vaultAddress: topAllocation.vault.address,
                      chainId: topAllocation.vault.chainId,
                    })}
                    className="btn-action bg-white text-curt-text hover:bg-white/90"
                  >
                    Review top pick
                  </button>
                ) : (
                  <button onClick={() => void handleGenerate(riskProfile)} className="btn-action bg-white text-curt-text hover:bg-white/90">
                    Generate {riskProfile} plan
                  </button>
                )}

                <button
                  onClick={() => void executeCurtisAction({ type: "toggle_curtain", label: "Open curtain view", open: true })}
                  className="btn-ghost bg-white/10 text-white hover:bg-white/16"
                >
                  Open curtain
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_360px]">
          <div className="rounded-[30px] border border-white/70 bg-white/70 shadow-[0_22px_48px_rgba(16,28,24,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-curt-border px-5 py-4 sm:px-6">
              <div>
                <span className="section-label">Conversation</span>
                <p className="mt-2 text-[14px] text-curt-text-muted">A live strategic log, not a collapsed chat sidebar.</p>
              </div>
              {chatMessages.length > 0 && (
                <button onClick={clearChat} className="btn-ghost text-[12px]">
                  Clear log
                </button>
              )}
            </div>

            <div ref={scrollRef} className="max-h-[420px] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-4">
              {chatMessages.length === 0 && !thinking && (
                <div className="rounded-[26px] border border-dashed border-curt-border bg-white/60 px-5 py-8 text-center text-[14px] text-curt-text-muted">
                  Curtis is loading the first brief.
                </div>
              )}

              {chatMessages.map((msg, index) =>
                msg.role === "assistant" ? (
                  <AssistantMessage key={`${msg.role}-${index}`} msg={msg} isLatest={index === chatMessages.length - 1} />
                ) : (
                  <UserMessage key={`${msg.role}-${index}`} msg={msg} isLatest={index === chatMessages.length - 1} />
                )
              )}

              <AnimatePresence>{thinking && <ThinkingState />}</AnimatePresence>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/70 p-5 shadow-[0_22px_48px_rgba(16,28,24,0.06)] sm:p-6">
            <span className="section-label">Command Curtis</span>
            <h2 className="mt-4 text-[26px] font-semibold tracking-tight text-curt-text">Give him an instruction worth acting on.</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-curt-text-muted">
              Ask for clearer reasoning, safer positioning, or a more aggressive target. Curtis responds with concrete moves instead of staying ornamental.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="mt-5 space-y-3"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Explain the weakest part of this portfolio, or tell Curtis exactly what posture you want..."
                className="input-clean min-h-32 w-full resize-none px-4 py-4 text-[14px] leading-relaxed"
                disabled={thinking}
              />

              <button type="submit" disabled={!input.trim() || thinking} className="btn-primary w-full py-3 text-[13px] disabled:opacity-30">
                Send to Curtis
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {prompts.map((prompt, index) => (
                <button
                  key={prompt}
                  onClick={() => void handleSend(prompt)}
                  className="group w-full rounded-[24px] border border-white/70 bg-white/68 p-4 text-left transition-all hover:border-curt-accent-muted hover:bg-curt-accent-light"
                >
                  <span className="text-[11px] uppercase tracking-[0.22em] text-curt-text-muted">Prompt {index + 1}</span>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-curt-text group-hover:text-curt-accent">{prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
