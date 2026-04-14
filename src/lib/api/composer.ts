import type { QuoteParams, QuoteResponse } from "../types";

const BASE_URL = "https://li.quest";

export async function getQuote(
  params: QuoteParams,
  apiKey?: string
): Promise<QuoteResponse> {
  const url = new URL("/v1/quote", BASE_URL);
  url.searchParams.set("fromChain", String(params.fromChain));
  url.searchParams.set("toChain", String(params.toChain));
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAddress", params.fromAddress);
  url.searchParams.set("toAddress", params.toAddress);
  url.searchParams.set("fromAmount", params.fromAmount);

  const res = await fetch(url.toString(), {
    headers: apiKey ? { "x-lifi-api-key": apiKey } : undefined,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Composer error ${res.status}: ${body}`);
  }
  return res.json();
}
