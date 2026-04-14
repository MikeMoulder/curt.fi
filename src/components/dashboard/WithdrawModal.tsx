"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAccount, useSendTransaction } from "wagmi";
import { POPULAR_TOKENS, SUPPORTED_CHAINS } from "@/lib/config";
import { parseTokenAmount, formatUsd } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

type TokenInfo = { address: string; symbol: string; decimals: number };

export default function WithdrawModal() {
  const withdrawOpen = useStore((s) => s.withdrawOpen);
  const setWithdrawOpen = useStore((s) => s.setWithdrawOpen);
  const withdrawVaultAddress = useStore((s) => s.withdrawVaultAddress);
  const setWithdrawVaultAddress = useStore((s) => s.setWithdrawVaultAddress);
  const positions = useStore((s) => s.positions);
  const requestPortfolioRefresh = useStore((s) => s.requestPortfolioRefresh);

  const { address } = useAccount();
  const { sendTransaction, isPending: isSending } = useSendTransaction();

  const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
  const [destChainId, setDestChainId] = useState(SUPPORTED_CHAINS[0].id);
  const [destToken, setDestToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<{ to: string; data: string; value: string; chainId: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (withdrawVaultAddress && positions.length > 0) {
      const idx = positions.findIndex((p) => p.vault.address === withdrawVaultAddress);
      if (idx >= 0) setSelectedPositionIndex(idx);
    }
  }, [withdrawVaultAddress, positions]);

  useEffect(() => {
    const tokens = POPULAR_TOKENS[destChainId];
    if (tokens?.length) setDestToken(tokens[0]);
  }, [destChainId]);

  const selectedPosition = positions[selectedPositionIndex] ?? null;

  function handleClose() {
    setWithdrawOpen(false);
    setWithdrawVaultAddress(null);
    setQuote(null);
    setError(null);
    setTxHash(null);
    setAmount("");
  }

  async function handleGetQuote() {
    if (!address || !selectedPosition || !destToken || !amount) return;
    setQuoting(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/composer/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: selectedPosition.vault.chainId,
          toChain: destChainId,
          fromToken: selectedPosition.vault.address,
          toToken: destToken.address,
          fromAddress: address,
          toAddress: address,
          fromAmount: parseTokenAmount(amount, selectedPosition.vault.tokens[0]?.decimals ?? 18),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get quote");
      }
      const data = await res.json();
      setQuote(data.transactionRequest);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setQuoting(false);
    }
  }

  function handleConfirm() {
    if (!quote) return;
    sendTransaction(
      {
        to: quote.to as `0x${string}`,
        data: quote.data as `0x${string}`,
        value: BigInt(quote.value || "0"),
        chainId: quote.chainId,
      },
      {
        onSuccess: (hash) => { setTxHash(hash); requestPortfolioRefresh(); },
        onError: (err) => { setError(err.message); },
      }
    );
  }

  const destTokens: TokenInfo[] = POPULAR_TOKENS[destChainId] ?? [];

  return (
    <AnimatePresence>
      {withdrawOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            className="w-full max-w-md rounded-2xl overflow-hidden bg-curt-surface border border-curt-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-curt-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-curt-danger/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-curt-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" /></svg>
                </div>
                <h2 className="text-base font-bold">Withdraw</h2>
              </div>
              <button onClick={handleClose} className="btn-ghost p-1.5 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {txHash ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-curt-accent-light flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-curt-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <p className="font-semibold text-curt-accent">Withdrawal sent</p>
                  <p className="text-[11px] text-curt-text-muted font-mono break-all px-4">{txHash}</p>
                  <button onClick={handleClose} className="btn-primary px-6 py-2.5 text-sm">Done</button>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-curt-text-muted">No positions to withdraw from.</p>
                </div>
              ) : (
                <>
                  {/* Position selector */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">Position</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {positions.map((p, i) => (
                        <button
                          key={`${p.vault.address}-${i}`}
                          onClick={() => setSelectedPositionIndex(i)}
                          className={`w-full text-left rounded-xl p-3 transition-all cursor-pointer border ${
                            selectedPositionIndex === i
                              ? "bg-curt-accent-light border-curt-accent/20"
                              : "bg-curt-surface-alt border-curt-border hover:border-curt-accent/10"
                          }`}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <span>
                              <span className="font-semibold">{p.vault.protocol.name}</span>
                              <span className="text-curt-text-muted ml-1.5 text-xs">
                                {p.vault.tokens.map((t) => t.symbol).join(" / ")}
                              </span>
                            </span>
                            <span className="font-data font-semibold text-xs">{formatUsd(parseFloat(p.balanceUsd || "0"))}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium">Amount</label>
                      {selectedPosition && (
                        <button onClick={() => setAmount(selectedPosition.balance)} className="text-[11px] text-curt-accent font-medium hover:text-curt-accent-hover cursor-pointer">
                          MAX
                        </button>
                      )}
                    </div>
                    <input
                      type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" min="0" step="any"
                      className="input-clean w-full px-4 py-3 font-data text-lg"
                    />
                  </div>

                  {/* Destination chain */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">Receive on</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SUPPORTED_CHAINS.map((chain) => (
                        <button key={chain.id} onClick={() => setDestChainId(chain.id)} className={`chip ${destChainId === chain.id ? "chip-active" : ""}`}>
                          {chain.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination token */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">Receive as</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {destTokens.map((token) => (
                        <button key={token.address} onClick={() => setDestToken(token)} className={`chip ${destToken?.address === token.address ? "chip-active" : ""}`}>
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-curt-danger">{error}</p>}

                  {quote && (
                    <div className="rounded-xl p-3 text-sm text-curt-accent bg-curt-accent-light flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Quote ready. Confirm to proceed.
                    </div>
                  )}

                  <button
                    onClick={quote ? handleConfirm : handleGetQuote}
                    disabled={!amount || !selectedPosition || !destToken || quoting || isSending}
                    className="btn-primary w-full py-3.5 text-sm"
                  >
                    {isSending ? "Confirming..." : quoting ? "Getting quote..." : quote ? "Confirm Withdrawal" : "Get Quote"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
