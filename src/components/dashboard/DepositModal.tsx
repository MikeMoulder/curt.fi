"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAccount, useSendTransaction } from "wagmi";
import { POPULAR_TOKENS, SUPPORTED_CHAINS } from "@/lib/config";
import { parseTokenAmount, chainName } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

type TokenInfo = { address: string; symbol: string; decimals: number };

export default function DepositModal() {
  const depositOpen = useStore((s) => s.depositOpen);
  const setDepositOpen = useStore((s) => s.setDepositOpen);
  const depositVaultAddress = useStore((s) => s.depositVaultAddress);
  const setDepositVaultAddress = useStore((s) => s.setDepositVaultAddress);
  const vaults = useStore((s) => s.vaults);
  const requestPortfolioRefresh = useStore((s) => s.requestPortfolioRefresh);

  const { address } = useAccount();
  const { sendTransaction, isPending: isSending } = useSendTransaction();

  const [selectedChainId, setSelectedChainId] = useState(SUPPORTED_CHAINS[0].id);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<{ to: string; data: string; value: string; chainId: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const targetVault = depositVaultAddress ? vaults.find((v) => v.address === depositVaultAddress) : null;

  useEffect(() => {
    const tokens = POPULAR_TOKENS[selectedChainId];
    if (tokens?.length) setSelectedToken(tokens[0]);
  }, [selectedChainId]);

  function handleClose() {
    setDepositOpen(false);
    setDepositVaultAddress(null);
    setQuote(null);
    setError(null);
    setTxHash(null);
    setAmount("");
  }

  async function handleGetQuote() {
    if (!address || !selectedToken || !amount || !targetVault) return;
    setQuoting(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/composer/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: selectedChainId,
          toChain: targetVault.chainId,
          fromToken: selectedToken.address,
          toToken: targetVault.address,
          fromAddress: address,
          toAddress: address,
          fromAmount: parseTokenAmount(amount, selectedToken.decimals),
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

  const tokens: TokenInfo[] = POPULAR_TOKENS[selectedChainId] ?? [];

  return (
    <AnimatePresence>
      {depositOpen && (
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
                <div className="w-7 h-7 rounded-lg bg-curt-accent/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-curt-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <h2 className="text-base font-bold">Deposit</h2>
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
                  <p className="font-semibold text-curt-accent">Transaction sent</p>
                  <p className="text-[11px] text-curt-text-muted font-mono break-all px-4">{txHash}</p>
                  <button onClick={handleClose} className="btn-primary px-6 py-2.5 text-sm">Done</button>
                </div>
              ) : (
                <>
                  {/* Vault target */}
                  {targetVault ? (
                    <div className="rounded-xl p-3.5 flex items-center justify-between bg-curt-surface-alt border border-curt-border">
                      <div className="text-sm">
                        <span className="text-curt-text-muted">Into </span>
                        <span className="font-semibold">{targetVault.protocol.name}</span>
                        <span className="text-curt-text-muted"> on {chainName(targetVault.chainId)}</span>
                      </div>
                      {targetVault.analytics.totalApy != null && (
                        <span className="font-data text-xs font-semibold text-curt-accent bg-curt-accent/10 px-2 py-1 rounded-lg">
                          {targetVault.analytics.totalApy.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-curt-text-muted">Select a vault from strategy or ask Curtis.</p>
                  )}

                  {/* Chain */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">From chain</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SUPPORTED_CHAINS.map((chain) => (
                        <button key={chain.id} onClick={() => setSelectedChainId(chain.id)} className={`chip ${selectedChainId === chain.id ? "chip-active" : ""}`}>
                          {chain.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Token */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">Token</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {tokens.map((token) => (
                        <button key={token.address} onClick={() => setSelectedToken(token)} className={`chip ${selectedToken?.address === token.address ? "chip-active" : ""}`}>
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[11px] text-curt-text-muted uppercase tracking-wider font-medium mb-2 block">Amount</label>
                    <input
                      type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" min="0" step="any"
                      className="input-clean w-full px-4 py-3 font-data text-lg"
                    />
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
                    disabled={!amount || !selectedToken || !targetVault || quoting || isSending}
                    className="btn-primary w-full py-3.5 text-sm"
                  >
                    {isSending ? "Confirming..." : quoting ? "Getting quote..." : quote ? "Confirm Deposit" : "Get Quote"}
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
