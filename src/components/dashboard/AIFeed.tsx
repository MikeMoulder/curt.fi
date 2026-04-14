"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { fetchCurtisReply } from "@/lib/ai/curtis-client";
import { executeCurtisAction } from "@/lib/ai/curtis-actions";
import type { CurtisAction, ChatMessage } from "@/lib/types";
import { formatUsd, formatApy } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ── Suggestions ── */
const SUGGESTIONS_NEW = [
  "Where should I put my first deposit?",
  "What vaults are earning the most right now?",
  "Build me a balanced strategy",
];

const SUGGESTIONS_EXISTING = [
  "How is my portfolio doing?",
  "Make my portfolio safer",
  "Where can I earn more?",
  "Rebalance my positions",
];

/* ── AI Response Block ── */
function AIResponseBlock({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  const headline = message.content.split(/[.!?]\s/)[0] + (message.content.match(/[.!?]/) ? message.content.match(/[.!?]/)![0] : ".");
  const body = message.content.slice(headline.length).trim();

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="card card-shadow p-5 sm:p-6"
    >
      {/* Category badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="badge badge-ai">
          <span className="w-1.5 h-1.5 rounded-full bg-curt-violet pulse-dot" />
          Curtis
        </span>
      </div>

      {/* Headline */}
      <p className="text-[15px] font-semibold text-curt-text leading-snug">
        {headline}
      </p>

      {/* Body */}
      {body && (
        <p className="mt-2 text-sm text-curt-text-secondary leading-relaxed">
          {body}
        </p>
      )}

      {/* Actions */}
      {message.actions && message.actions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-curt-border flex flex-wrap gap-2">
          {message.actions.map((action, i) => (
            <button
              key={i}
              onClick={() => executeCurtisAction(action)}
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

function ActionIcon({ type }: { type: CurtisAction["type"] }) {
  switch (type) {
    case "open_deposit":
      return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    case "open_withdraw":
      return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" /></svg>;
    case "generate_strategy":
      return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;
    case "toggle_curtain":
      return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /></svg>;
    default:
      return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
  }
}

/* ── User Query Block ── */
function UserQueryBlock({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 py-2"
    >
      <div className="w-6 h-6 rounded-full bg-curt-surface-alt flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-curt-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <p className="text-sm text-curt-text-secondary pt-0.5">{message.content}</p>
    </motion.div>
  );
}

/* ── Thinking indicator ── */
function ThinkingBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 border-curt-violet/20"
    >
      <div className="flex items-center gap-2.5">
        <span className="badge badge-ai">
          <span className="w-1.5 h-1.5 rounded-full bg-curt-violet pulse-dot" />
          Curtis
        </span>
        <span className="text-sm text-curt-text-muted">Analyzing...</span>
      </div>
      <div className="mt-3 flex gap-3">
        <div className="h-3 w-32 shimmer rounded" />
        <div className="h-3 w-48 shimmer rounded" />
      </div>
      <div className="mt-2 flex gap-3">
        <div className="h-3 w-56 shimmer rounded" />
        <div className="h-3 w-20 shimmer rounded" />
      </div>
    </motion.div>
  );
}

/* ── Main Feed ── */
export default function AIFeed() {
  const chatMessages = useStore((s) => s.chatMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const positions = useStore((s) => s.positions);
  const vaults = useStore((s) => s.vaults);
  const totalBalance = useStore((s) => s.totalBalance);
  const blendedApy = useStore((s) => s.blendedApy);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasPositions = positions.length > 0;

  // Scroll to bottom
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, thinking]);

  // Auto-generate initial analysis once data is loaded
  const runInitialAnalysis = useCallback(async () => {
    if (initialized || vaults.length === 0) return;
    setInitialized(true);

    if (!hasPositions) {
      addChatMessage({
        role: "assistant",
        content: `Welcome to curt.fi. I'm Curtis, your AI strategist. You don't have any active positions yet. I can help you find the best risk-adjusted yield across 21 chains and 672+ vaults. Tell me your risk preference, or just say "deposit" to get started.`,
        actions: [
          { type: "generate_strategy", label: "Generate strategy", riskProfile: "balanced" },
          { type: "open_deposit", label: "Deposit" },
        ],
      });
      return;
    }

    // Build a context-aware initial summary
    const summary = `Your portfolio holds ${formatUsd(totalBalance)} earning ${formatApy(blendedApy)} blended APY across ${positions.length} position${positions.length !== 1 ? "s" : ""}. I've analyzed current vault conditions across all supported chains. Ask me to optimize, rebalance, or explain your current allocations.`;
    addChatMessage({
      role: "assistant",
      content: summary,
      actions: [
        { type: "generate_strategy", label: "Optimize allocation" },
        { type: "toggle_curtain", label: "Show positions", open: true },
      ],
    });
  }, [initialized, vaults.length, hasPositions, totalBalance, blendedApy, positions.length, addChatMessage]);

  useEffect(() => {
    if (vaults.length > 0 && !initialized) {
      runInitialAnalysis();
    }
  }, [vaults.length, initialized, runInitialAnalysis]);

  async function handleSend(text?: string) {
    const query = (text ?? input).trim();
    if (!query || thinking) return;
    setInput("");
    addChatMessage({ role: "user", content: query });
    setThinking(true);

    try {
      const reply = await fetchCurtisReply(query, positions, vaults, chatMessages);
      addChatMessage({
        role: "assistant",
        content: reply.message,
        actions: reply.actions,
      });
    } catch {
      addChatMessage({
        role: "assistant",
        content: "I couldn't process that right now. Please try again.",
      });
    } finally {
      setThinking(false);
    }
  }

  const suggestions = hasPositions ? SUGGESTIONS_EXISTING : SUGGESTIONS_NEW;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Response feed */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {chatMessages.length === 0 && !thinking && (
          <div className="text-center py-12">
            <div className="w-10 h-10 rounded-xl bg-curt-violet-light flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-curt-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm text-curt-text-muted">Curtis is loading vault data...</p>
          </div>
        )}

        {chatMessages.map((msg, i) =>
          msg.role === "assistant" ? (
            <AIResponseBlock key={i} message={msg} isLatest={i === chatMessages.length - 1} />
          ) : (
            <UserQueryBlock key={i} message={msg} isLatest={i === chatMessages.length - 1} />
          )
        )}

        <AnimatePresence>
          {thinking && <ThinkingBlock />}
        </AnimatePresence>

        <div ref={feedEndRef} />
      </div>

      {/* Suggestions */}
      {!thinking && chatMessages.length <= 2 && (
        <div className="flex gap-2 flex-wrap px-1 pb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="text-xs text-curt-text-muted border border-curt-border rounded-lg px-3 py-1.5 hover:border-curt-accent hover:text-curt-accent transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Command bar */}
      <div className="border-t border-curt-border pt-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Curtis about your money..."
            className="input-clean flex-1 px-4 py-3 text-sm"
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="btn-primary px-4 py-3 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
