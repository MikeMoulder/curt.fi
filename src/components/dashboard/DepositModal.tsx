"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from "wagmi";
import { POPULAR_TOKENS, SUPPORTED_CHAINS } from "@/lib/config";
import { parseTokenAmount, chainName } from "@/lib/utils";
import type { QuoteResponse } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

type TokenInfo = { address: string; symbol: string; decimals: number };

export default function DepositModal() {
  const depositOpen = useStore((s) => s.depositOpen);
  const setDepositOpen = useStore((s) => s.setDepositOpen);
  const depositVaultAddress = useStore((s) => s.depositVaultAddress);
  const setDepositVaultAddress = useStore((s) => s.setDepositVaultAddress);
  const depositDraft = useStore((s) => s.depositDraft);
  const clearDepositDraft = useStore((s) => s.clearDepositDraft);
  const vaults = useStore((s) => s.vaults);
  const requestPortfolioRefresh = useStore((s) => s.requestPortfolioRefresh);

  const { address } = useAccount();
  const currentChainId = useChainId();
  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const [selectedChainId, setSelectedChainId] = useState<number>(SUPPORTED_CHAINS[0].id);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const autoQuoteKeyRef = useRef<string | null>(null);
  const autoSubmitRef = useRef(false);

  const targetVault = depositVaultAddress ? vaults.find((v) => v.address === depositVaultAddress) : null;
  const transactionRequest = quote?.transactionRequest ?? null;
  const needsChainSwitch = transactionRequest != null && currentChainId !== transactionRequest.chainId;
  const tokens: TokenInfo[] = POPULAR_TOKENS[selectedChainId] ?? [];
  const requestedTokenReady =
    !depositDraft?.tokenSymbol ||
    selectedToken?.symbol.toLowerCase() === depositDraft.tokenSymbol.toLowerCase();
  const requestedChainReady =
    !depositDraft?.fromChainId || selectedChainId === depositDraft.fromChainId;

  useEffect(() => {
    if (!depositOpen) return;

    if (depositDraft?.fromChainId) {
      setSelectedChainId(depositDraft.fromChainId);
    }

    if (depositDraft?.amount) {
      setAmount(depositDraft.amount);
    }
  }, [depositDraft?.amount, depositDraft?.fromChainId, depositOpen]);

  useEffect(() => {
    const availableTokens = POPULAR_TOKENS[selectedChainId] ?? [];

    if (!availableTokens.length) {
      setSelectedToken(null);
      return;
    }

    const preferredToken = depositDraft?.tokenSymbol
      ? availableTokens.find(
          (token) => token.symbol.toLowerCase() === depositDraft.tokenSymbol?.toLowerCase()
        )
      : null;

    if (preferredToken) {
      setSelectedToken(preferredToken);
      return;
    }

    if (!selectedToken || !availableTokens.some((token) => token.address === selectedToken.address)) {
      setSelectedToken(availableTokens[0]);
    }
  }, [depositDraft?.tokenSymbol, depositOpen, selectedChainId, selectedToken]);

  useEffect(() => {
    setQuote(null);
    setError(null);
    autoQuoteKeyRef.current = null;
    autoSubmitRef.current = false;
  }, [amount, depositVaultAddress, selectedChainId, selectedToken?.address]);

  const handleGetQuote = useCallback(async () => {
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
      const data = (await res.json()) as QuoteResponse;
      setQuote(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setQuoting(false);
    }
  }, [address, amount, selectedChainId, selectedToken, targetVault]);

  useEffect(() => {
    if (
      !depositOpen ||
      !depositDraft?.autoQuote ||
      !address ||
      !selectedToken ||
      !amount ||
      !targetVault ||
      !requestedTokenReady ||
      !requestedChainReady ||
      quoting ||
      quote
    ) {
      return;
    }

    const quoteKey = [targetVault.address, selectedChainId, selectedToken.address, amount].join(":");
    if (autoQuoteKeyRef.current === quoteKey) return;

    autoQuoteKeyRef.current = quoteKey;
    void handleGetQuote();
  }, [address, amount, depositDraft?.autoQuote, depositOpen, handleGetQuote, quote, quoting, requestedChainReady, requestedTokenReady, selectedChainId, selectedToken, targetVault]);

  function handleClose() {
    setDepositOpen(false);
    setDepositVaultAddress(null);
    clearDepositDraft();
    setQuote(null);
    setError(null);
    setTxHash(null);
    setAmount("");
    autoQuoteKeyRef.current = null;
    autoSubmitRef.current = false;
  }

  const handleConfirm = useCallback(async () => {
    if (!transactionRequest) return;
    setError(null);

    try {
      if (currentChainId !== transactionRequest.chainId) {
        await switchChainAsync({ chainId: transactionRequest.chainId });
      }

      const hash = await sendTransactionAsync({
        to: transactionRequest.to as `0x${string}`,
        data: transactionRequest.data as `0x${string}`,
        value: BigInt(transactionRequest.value || "0"),
        chainId: transactionRequest.chainId,
      });

      setTxHash(hash);
      requestPortfolioRefresh();
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : `Failed to submit transaction on ${chainName(transactionRequest.chainId)}`
      );
    }
  }, [currentChainId, requestPortfolioRefresh, sendTransactionAsync, switchChainAsync, transactionRequest]);

  useEffect(() => {
    if (
      !depositOpen ||
      !depositDraft?.autoSubmit ||
      !transactionRequest ||
      isSending ||
      isSwitchingChain ||
      txHash
    ) {
      return;
    }

    if (autoSubmitRef.current) return;

    autoSubmitRef.current = true;
    void handleConfirm();
  }, [depositDraft?.autoSubmit, depositOpen, handleConfirm, isSending, isSwitchingChain, transactionRequest, txHash]);

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
                  {depositDraft?.intentNote && (
                    <div className="rounded-xl border border-curt-accent/20 bg-curt-accent-light px-3.5 py-3 text-sm text-curt-text-secondary">
                      <span className="font-semibold text-curt-text">Curtis plan:</span> {depositDraft.intentNote}
                    </div>
                  )}

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
                    <p className="text-sm text-curt-text-muted">Choose a vault from the current plan or use chat to find one.</p>
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

                  {quote && transactionRequest && (
                    <div className="rounded-xl p-3 text-sm text-curt-accent bg-curt-accent-light">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        <span>
                          {needsChainSwitch
                            ? `Route ready. Your wallet will switch to ${chainName(transactionRequest.chainId)} before approval.`
                            : "Route ready. Approve in wallet to finish the deposit."}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-curt-text-secondary">
                        From {amount} {selectedToken?.symbol} on {chainName(selectedChainId)} into {targetVault?.protocol.name}.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={quote ? handleConfirm : () => void handleGetQuote()}
                    disabled={!amount || !selectedToken || !targetVault || quoting || isSending || isSwitchingChain}
                    className="btn-primary w-full py-3.5 text-sm"
                  >
                    {isSwitchingChain
                      ? "Switching chain..."
                      : isSending
                        ? "Opening wallet..."
                        : quoting
                          ? "Preparing route..."
                          : quote
                            ? needsChainSwitch
                              ? "Switch Network & Approve"
                              : "Approve in Wallet"
                            : "Prepare Deposit"}
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
