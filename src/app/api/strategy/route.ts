import { NextRequest, NextResponse } from "next/server";
import { generateStrategy } from "@/lib/ai/strategy";
import type { RiskProfile } from "@/lib/types";
import type { StrategyPositionInput, StrategyVaultInput } from "@/lib/ai/strategy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vaults = Array.isArray(body?.vaults)
      ? (body.vaults as StrategyVaultInput[])
      : [];
    const positions = Array.isArray(body?.positions)
      ? (body.positions as StrategyPositionInput[])
      : [];
    const riskProfile = (body?.riskProfile || "balanced") as RiskProfile;

    if (!vaults.length) {
      return NextResponse.json(
        { error: "No vaults provided" },
        { status: 400 }
      );
    }

    const strategy = generateStrategy(vaults, riskProfile, positions);
    return NextResponse.json(strategy);
  } catch (error) {
    console.error("Strategy API error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    );
  }
}
