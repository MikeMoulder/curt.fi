export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatApy(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const raw = whole + paddedFraction;
  return raw.replace(/^0+/, "") || "0";
}

export function formatTokenAmount(amount: string, decimals: number): string {
  const sanitized = amount.replace(/^0+/, "") || "0";

  if (decimals === 0) {
    return sanitized;
  }

  const whole =
    sanitized.length > decimals
      ? sanitized.slice(0, sanitized.length - decimals)
      : "0";
  const fraction = sanitized
    .slice(-decimals)
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function chainName(chainId: number): string {
  const names: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    42161: "Arbitrum",
    10: "Optimism",
    137: "Polygon",
    56: "BNB Chain",
    43114: "Avalanche",
    250: "Fantom",
    100: "Gnosis",
    324: "zkSync",
    59144: "Linea",
    534352: "Scroll",
    1101: "Polygon zkEVM",
    5000: "Mantle",
    169: "Manta Pacific",
    81457: "Blast",
    34443: "Mode",
    252: "Fraxtal",
  };
  return names[chainId] || `Chain ${chainId}`;
}

export function chainColor(chainId: number): string {
  const colors: Record<number, string> = {
    1: "#627EEA",
    8453: "#0052FF",
    42161: "#28A0F0",
    10: "#FF0420",
    137: "#8247E5",
    56: "#F0B90B",
    43114: "#E84142",
  };
  return colors[chainId] || "#6B7280";
}
