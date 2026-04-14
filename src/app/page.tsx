"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Providers from "./providers";

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function HomeContent() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-curt-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto">
        <span className="text-[17px] font-semibold tracking-tight text-curt-text">
          curt<span className="text-curt-accent">.fi</span>
        </span>
        <div className="flex items-center gap-6">
          <Link href="#how" className="hidden sm:block text-[13px] text-curt-text-muted hover:text-curt-text transition-colors">
            How it works
          </Link>
          <Link href="#curtis" className="hidden sm:block text-[13px] text-curt-text-muted hover:text-curt-text transition-colors">
            Meet Curtis
          </Link>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-10 pt-24 sm:pt-32 pb-24 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <motion.h1
            className="text-[40px] sm:text-[56px] font-semibold tracking-tight text-curt-text leading-[1.08]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Your money should
            <br />
            work harder.
          </motion.h1>

          <motion.p
            className="mt-5 text-[17px] text-curt-text-muted max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            curt.fi intelligently routes your funds across the best opportunities in DeFi — with guidance from Curtis, your AI portfolio agent.
          </motion.p>

          <motion.div
            className="mt-8 flex gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            {isConnected ? (
              <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-[14px]">
                Open Dashboard
              </Link>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => {
                  if (!mounted) return null;
                  return (
                    <button onClick={openConnectModal} className="btn-primary px-6 py-2.5 text-[14px]">
                      Connect Wallet
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            )}
            <Link href="#how" className="btn-secondary px-6 py-2.5 text-[14px]">
              View Demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-6 sm:px-10 pb-20 max-w-4xl mx-auto">
        <Reveal>
          <div className="flex items-center justify-between px-8 py-5 border-y border-curt-border">
            {[
              { value: "672+", label: "Vaults" },
              { value: "21", label: "Chains" },
              { value: "~8%", label: "Target APY" },
              { value: "20+", label: "Protocols" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-8 bg-curt-border hidden sm:block" />}
                <div className="text-center">
                  <p className="font-data text-lg font-semibold text-curt-text">{s.value}</p>
                  <p className="text-[11px] text-curt-text-muted mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 sm:px-10 py-20 max-w-4xl mx-auto">
        <Reveal>
          <p className="text-[12px] font-medium text-curt-text-muted uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-curt-text tracking-tight">
            Three steps. Zero complexity.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Deposit like a bank",
              body: "Connect your wallet and deposit from any chain. LI.FI routes the transaction in a single step — no bridging required.",
            },
            {
              n: "02",
              title: "Curtis analyzes & allocates",
              body: "Your AI agent scans 672+ vaults across 21 chains, evaluates risk, APY trends, and TVL stability, then builds your allocation.",
            },
            {
              n: "03",
              title: "Pull the curtain to see everything",
              body: "Full transparency anytime. See where your money sits, why it's there, and how Curtis is thinking. No black boxes.",
            },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div>
                <span className="font-data text-[12px] font-semibold text-curt-accent">{step.n}</span>
                <h3 className="text-[16px] font-semibold text-curt-text mt-2 mb-2">{step.title}</h3>
                <p className="text-[14px] text-curt-text-muted leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Curtis intro */}
      <section id="curtis" className="px-6 sm:px-10 py-20 max-w-4xl mx-auto">
        <Reveal>
          <p className="text-[12px] font-medium text-curt-text-muted uppercase tracking-wider mb-3">Meet Curtis</p>
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-curt-text tracking-tight max-w-xl">
            Your AI portfolio strategist.
          </h2>
          <p className="mt-4 text-[15px] text-curt-text-muted max-w-lg leading-relaxed">
            Curtis continuously monitors conditions, suggests improvements, and executes with your approval. Not a chatbot — a financial agent.
          </p>
        </Reveal>

        {/* Example recommendation card */}
        <Reveal delay={0.1}>
          <div className="mt-10 max-w-md">
            <div className="card card-shadow p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge badge-ai">
                  <span className="w-1.5 h-1.5 rounded-full bg-curt-violet live-dot" />
                  Curtis
                </span>
              </div>
              <p className="text-[15px] font-semibold text-curt-text">
                Reallocate 20% to increase yield
              </p>
              <p className="text-[13px] text-curt-text-muted mt-1.5 leading-relaxed">
                Moving funds to Morpho on Base increases your blended APY from 8.5% to 9.7% with minimal added risk.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="btn-action pointer-events-none">Accept</span>
                <span className="btn-ghost pointer-events-none text-[13px]">Modify</span>
                <span className="btn-ghost pointer-events-none text-[13px]">Dismiss</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Curtis capabilities */}
        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {[
            {
              title: "Proactive insights",
              body: "Curtis notifies you when better opportunities emerge or when market conditions change.",
            },
            {
              title: "Actionable decisions",
              body: "Every recommendation comes with clear actions. Accept, modify, or dismiss — you're always in control.",
            },
            {
              title: "Full transparency",
              body: "Pull the curtain anytime to see exactly how Curtis is thinking and why each decision was made.",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div>
                <h3 className="text-[14px] font-semibold text-curt-text mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-curt-text-muted leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-10 py-24 max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-curt-text tracking-tight">
            Start growing your capital.
          </h2>
          <p className="text-curt-text-muted mt-3 mb-8 text-[15px]">No signup. No KYC. Connect and go.</p>
          {isConnected ? (
            <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-[14px]">
              Open Dashboard
            </Link>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal, mounted }) => {
                if (!mounted) return null;
                return (
                  <button onClick={openConnectModal} className="btn-primary px-6 py-2.5 text-[14px]">
                    Connect Wallet
                  </button>
                );
              }}
            </ConnectButton.Custom>
          )}
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-6 border-t border-curt-border max-w-6xl mx-auto flex items-center justify-between">
        <span className="text-[13px] font-semibold text-curt-text">
          curt<span className="text-curt-accent">.fi</span>
        </span>
        <span className="text-[11px] text-curt-text-muted">Powered by LI.FI</span>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Providers>
      <HomeContent />
    </Providers>
  );
}
