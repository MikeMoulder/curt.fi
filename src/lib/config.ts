import { http } from "wagmi";
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const wagmiConfig = getDefaultConfig({
  appName: "curt.fi",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [mainnet, base, arbitrum, optimism, polygon],
  transports: {
    [mainnet.id]: http(`/api/rpc/${mainnet.id}`),
    [base.id]: http(`/api/rpc/${base.id}`),
    [arbitrum.id]: http(`/api/rpc/${arbitrum.id}`),
    [optimism.id]: http(`/api/rpc/${optimism.id}`),
    [polygon.id]: http(`/api/rpc/${polygon.id}`),
  },
});

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, optimism, polygon];

export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

export const POPULAR_TOKENS: Record<number, { address: string; symbol: string; decimals: number }[]> = {
  [mainnet.id]: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
  ],
  [base.id]: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
  ],
  [arbitrum.id]: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
  ],
  [optimism.id]: [
    { address: NATIVE_TOKEN, symbol: "ETH", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
  ],
  [polygon.id]: [
    { address: NATIVE_TOKEN, symbol: "POL", decimals: 18 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", decimals: 6 },
  ],
};
