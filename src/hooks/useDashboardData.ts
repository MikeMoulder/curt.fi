"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useStore } from "@/store/useStore";

export function useDashboardData() {
  const { address, isConnected } = useAccount();
  const setVaults = useStore((s) => s.setVaults);
  const setPositions = useStore((s) => s.setPositions);
  const setLoading = useStore((s) => s.setLoading);
  const portfolioRefreshNonce = useStore((s) => s.portfolioRefreshNonce);

  // Fetch vaults once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/earn/vaults?all=true");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setVaults(json.data ?? []);
      } catch {
        /* vault fetch failed — UI degrades gracefully */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setVaults]);

  // Fetch positions when wallet connected (and on refresh)
  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/earn/portfolio/${address}/positions`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setPositions(json.data ?? []);
      } catch {
        if (!cancelled) setPositions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, portfolioRefreshNonce, setPositions, setLoading]);
}
