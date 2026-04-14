import type { Chain, Position, Protocol, Vault, VaultsResponse } from "../types";

const BASE_URL = "https://earn.li.fi";

interface RawEarnToken {
  address?: string;
  symbol?: string;
  decimals?: number;
  name?: string;
  logoURI?: string;
  priceUsd?: string;
}

interface RawEarnProtocol {
  name?: string;
  logoURI?: string;
  url?: string;
}

interface RawEarnAnalytics {
  apy?: {
    base?: number | null;
    reward?: number | null;
    total?: number | null;
  };
  apy1d?: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvl?: {
    usd?: number | string | null;
  };
}

interface RawEarnVault {
  address?: string;
  network?: string;
  chainId?: number;
  name?: string;
  protocol?: RawEarnProtocol | null;
  underlyingTokens?: RawEarnToken[] | null;
  analytics?: RawEarnAnalytics | null;
  tags?: string[] | null;
  isTransactional?: boolean | null;
}

interface RawEarnVaultsResponse {
  data?: RawEarnVault[];
  nextCursor?: string;
}

interface RawEarnPositionsResponse {
  data?: Array<
    Omit<Position, "vault"> & {
      vault: RawEarnVault;
    }
  >;
}

type FetchJsonInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

async function fetchJson<T>(
  path: string,
  params?: Record<string, string>,
  requestInit?: FetchJsonInit
): Promise<T> {
  const url = new URL(path, BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(
    url.toString(),
    requestInit ?? {
      next: { revalidate: 60 },
    }
  );

  if (!response.ok) {
    throw new Error(`Earn API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function toUsdString(value: number | string | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return "0";
}

function normalizePercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Number((value * 100).toFixed(2));
}

function transformVault(raw: RawEarnVault): Vault {
  const analytics = raw.analytics ?? {};
  const apy = analytics.apy ?? {};

  return {
    address: raw.address ?? "",
    network: raw.network ?? "",
    chainId: raw.chainId ?? 0,
    name: raw.name,
    protocol: {
      name: raw.protocol?.name ?? "Unknown",
      logoURI: raw.protocol?.logoURI,
      url: raw.protocol?.url,
    },
    tokens: (raw.underlyingTokens ?? []).map((token) => ({
      address: token.address ?? "",
      symbol: token.symbol ?? "UNKNOWN",
      decimals: token.decimals ?? 18,
      name: token.name ?? token.symbol ?? "Unknown token",
      chainId: raw.chainId ?? 0,
      logoURI: token.logoURI,
      priceUsd: token.priceUsd,
    })),
    analytics: {
      baseApy: normalizePercent(apy.base),
      rewardApy: normalizePercent(apy.reward),
      totalApy: normalizePercent(apy.total),
      apy1d: normalizePercent(analytics.apy1d),
      apy7d: normalizePercent(analytics.apy7d),
      apy30d: normalizePercent(analytics.apy30d),
      tvlUsd: toUsdString(analytics.tvl?.usd),
    },
    tags: raw.tags ?? [],
    isTransactional: raw.isTransactional ?? false,
  };
}

export async function getVaults(opts?: {
  chainId?: number;
  asset?: string;
  protocol?: string;
  minTvl?: string;
  sortBy?: string;
  limit?: string;
  cursor?: string;
}): Promise<VaultsResponse> {
  const params: Record<string, string> = {};

  if (opts?.chainId) params.chainId = String(opts.chainId);
  if (opts?.asset) params.asset = opts.asset;
  if (opts?.protocol) params.protocol = opts.protocol;
  if (opts?.minTvl) params.minTvlUsd = opts.minTvl;
  if (opts?.sortBy) params.sortBy = opts.sortBy;
  if (opts?.limit) params.limit = opts.limit;
  if (opts?.cursor) params.cursor = opts.cursor;

  const raw = await fetchJson<RawEarnVaultsResponse>("/v1/earn/vaults", params);

  return {
    data: (raw.data ?? []).map(transformVault),
    nextCursor: raw.nextCursor,
  };
}

export async function getAllVaults(minTvl = "100000"): Promise<Vault[]> {
  const allVaults: Vault[] = [];
  let cursor: string | undefined;

  do {
    const response = await getVaults({
      minTvl,
      sortBy: "apy",
      cursor,
      limit: "100",
    });
    allVaults.push(...response.data);
    cursor = response.nextCursor;
  } while (cursor);

  return allVaults;
}

export async function getVault(network: string, address: string): Promise<Vault> {
  const raw = await fetchJson<RawEarnVault>(`/v1/earn/vaults/${network}/${address}`);
  return transformVault(raw);
}

export async function getChains(): Promise<Chain[]> {
  const response = await fetchJson<Chain[] | { data?: Chain[] }>("/v1/earn/chains");
  return Array.isArray(response) ? response : response.data ?? [];
}

export async function getProtocols(): Promise<Protocol[]> {
  const response = await fetchJson<Protocol[] | { data?: Protocol[] }>(
    "/v1/earn/protocols"
  );
  return Array.isArray(response) ? response : response.data ?? [];
}

export async function getPositions(userAddress: string): Promise<Position[]> {
  try {
    const response = await fetchJson<RawEarnPositionsResponse>(
      `/v1/earn/portfolio/${userAddress}/positions`,
      undefined,
      { cache: "no-store" }
    );

    return (response.data ?? []).map((position) => ({
      ...position,
      vault: transformVault(position.vault),
    }));
  } catch {
    return [];
  }
}
