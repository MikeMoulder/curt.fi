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
  "Build me a balanced plan",
];

const SUGGESTIONS_EXISTING = [
  "How is my portfolio doing?",
  "Make my portfolio safer",
  "Where can I earn more?",
  "Rebalance my positions",
];

/* ── AI Response Block ── */
function normalizeResponseContent(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(?:^|\s)\*\s+/g, "\n• ")
    .replace(/\n-\s+/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitResponseContent(content: string) {
  const normalized = normalizeResponseContent(content);
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { headline: normalized, detailBlocks: [] as string[] };
  }

  return {
    headline: blocks[0],
    detailBlocks: blocks.slice(1),
  };
}

function renderDetailBlock(block: string, key: string) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter(
    (line) => line.startsWith("•") || line.startsWith("-") || line.startsWith("*")
  );
  const textLines = lines.filter(
    (line) => !line.startsWith("•") && !line.startsWith("-") && !line.startsWith("*")
  );

  if (bulletLines.length > 0) {
    return (
      <div key={key} className="space-y-2">
        {textLines.length > 0 && (
          <p className="whitespace-pre-wrap">{textLines.join("\n")}</p>
        )}
        <ul className="list-disc space-y-1 pl-5">
          {bulletLines.map((line) => (
            <li key={`${key}-${line}`}>{line.replace(/^[•\-*]\s*/, "")}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <p key={key} className="whitespace-pre-wrap">{block}</p>;
}

function AIResponseBlock({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  const { headline, detailBlocks } = splitResponseContent(message.content);

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="rounded-[26px] border border-black/6 bg-white/72 p-5 shadow-[0_18px_48px_rgba(16,28,24,0.06)] backdrop-blur sm:p-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="badge badge-ai">
          <span className="w-1.5 h-1.5 rounded-full bg-curt-violet pulse-dot" />
          Curtis
        </span>
      </div>

      <p className="whitespace-pre-wrap text-[15px] font-semibold leading-snug text-curt-text">
        {headline}
      </p>

      {detailBlocks.length > 0 && (
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-curt-text-secondary">
          {detailBlocks.map((block, index) =>
            renderDetailBlock(block, `${index}-${block.slice(0, 16)}`)
          )}
        </div>
      )}

      {message.actions && message.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-black/6 pt-3">
          {message.actions.map((action, i) => (
            <button
              key={i}
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
      className="flex items-start justify-end py-2"
    >
      <div className="max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-tr-sm bg-curt-text px-4 py-3 text-sm leading-relaxed text-white shadow-[0_14px_32px_rgba(16,28,24,0.18)]">
        {message.content}
      </div>
    </motion.div>
  );
}

/* ── Thinking indicator ── */
function ThinkingBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[26px] border border-black/6 bg-white/68 p-5 backdrop-blur"
    >
      <div className="flex items-center gap-2.5">
        <span className="badge badge-ai">
          <span className="w-1.5 h-1.5 rounded-full bg-curt-violet pulse-dot" />
          Curtis
        </span>
        <span className="text-sm text-curt-text-muted">Looking through it...</span>
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
  const feedRef = useRef<HTMLDivElement>(null);
  const latestAssistantRef = useRef<HTMLDivElement>(null);
  const responseAnchorRef = useRef<HTMLDivElement>(null);
  const shouldSnapToResponseRef = useRef(false);
  const shouldSnapToReplyViewRef = useRef(false);

  const hasPositions = positions.length > 0;

  // Scroll to bottom
  useEffect(() => {
    const feed = feedRef.current;

    if (!feed) {
      return;
    }

    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length, thinking]);

  useEffect(() => {
    if (!thinking || !shouldSnapToResponseRef.current) {
      return;
    }

    shouldSnapToResponseRef.current = false;
    responseAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [thinking]);

  useEffect(() => {
    if (thinking || !shouldSnapToReplyViewRef.current) {
      return;
    }

    const latestMessage = chatMessages[chatMessages.length - 1];

    if (!latestMessage || latestMessage.role !== "assistant") {
      return;
    }

    shouldSnapToReplyViewRef.current = false;
    latestAssistantRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [chatMessages, thinking]);

  // Auto-generate initial analysis once data is loaded
  const runInitialAnalysis = useCallback(async () => {
    if (initialized || vaults.length === 0) return;
    setInitialized(true);

    if (!hasPositions) {
      addChatMessage({
        role: "assistant",
        content: `Welcome to curt.fi. You do not have any positions yet. I can help you compare starting options, explain the tradeoffs, or line up a first deposit. Tell me how cautious you want to be, or just say "deposit" to get started.`,
        actions: [
          { type: "generate_strategy", label: "Build a plan", riskProfile: "balanced" },
          { type: "open_deposit", label: "Make a deposit" },
        ],
      });
      return;
    }

    // Build a context-aware initial summary
    const summary = `You currently have ${formatUsd(totalBalance)} earning ${formatApy(blendedApy)} blended APY across ${positions.length} position${positions.length !== 1 ? "s" : ""}. If you want, I can look for a safer mix, a better rate, or walk through why each allocation is there.`;
    addChatMessage({
      role: "assistant",
      content: summary,
      actions: [
        { type: "generate_strategy", label: "Refresh plan" },
        { type: "toggle_curtain", label: "Open details", open: true },
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

    shouldSnapToResponseRef.current = true;
    shouldSnapToReplyViewRef.current = true;
    setInput("");
    addChatMessage({ role: "user", content: query });
    setThinking(true);

    try {
      const nextHistory: ChatMessage[] = [...chatMessages, { role: "user", content: query }];
      const reply = await fetchCurtisReply(query, positions, vaults, nextHistory);
      addChatMessage({
        role: "assistant",
        content: reply.message,
        actions: reply.actions,
      });

      const preparedDeposit = reply.actions?.find(
        (action) => action.type === "open_deposit" && action.autoQuote
      );

      if (preparedDeposit) {
        await executeCurtisAction(preparedDeposit);
      }
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
      <div ref={feedRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {chatMessages.length === 0 && !thinking && (
          <div className="text-center py-12">
            <div className="w-10 h-10 rounded-xl bg-curt-violet-light flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-curt-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm text-curt-text-muted">Loading market and portfolio data...</p>
          </div>
        )}

        {chatMessages.map((msg, i) =>
          msg.role === "assistant" ? (
            <div
              key={i}
              ref={i === chatMessages.length - 1 ? latestAssistantRef : undefined}
              className={i === chatMessages.length - 1 ? "scroll-mt-28" : undefined}
            >
              <AIResponseBlock message={msg} isLatest={i === chatMessages.length - 1} />
            </div>
          ) : (
            <UserQueryBlock key={i} message={msg} isLatest={i === chatMessages.length - 1} />
          )
        )}

        <AnimatePresence>
          {thinking && <ThinkingBlock />}
        </AnimatePresence>
      </div>

      {/* Suggestions */}
      {!thinking && chatMessages.length <= 2 && (
        <div className="flex flex-wrap gap-2 px-1 pb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="rounded-full border border-black/8 bg-white/74 px-3 py-2 text-xs font-medium text-curt-text-muted transition-colors hover:border-curt-accent hover:text-curt-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Command bar */}
      <div ref={responseAnchorRef} className="border-t border-black/6 pt-4 scroll-mt-28">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your portfolio..."
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
