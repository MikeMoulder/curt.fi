import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/api/composer";
import type { QuoteParams } from "@/lib/types";

function validateQuoteParams(body: Partial<QuoteParams>): body is QuoteParams {
  return (
    typeof body.fromChain === "number" &&
    typeof body.toChain === "number" &&
    typeof body.fromToken === "string" &&
    typeof body.toToken === "string" &&
    typeof body.fromAddress === "string" &&
    typeof body.toAddress === "string" &&
    typeof body.fromAmount === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!validateQuoteParams(body)) {
      return NextResponse.json(
        { error: "Invalid quote parameters" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.LIFI_API_KEY || process.env.NEXT_PUBLIC_LIFI_API_KEY;

    const quote = await getQuote(body, apiKey);
    return NextResponse.json(quote);
  } catch (error) {
    console.error("Composer quote API error:", error);
    return NextResponse.json(
      { error: "Failed to build quote" },
      { status: 500 }
    );
  }
}
