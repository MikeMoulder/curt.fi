import { NextResponse } from "next/server";
import { getChains } from "@/lib/api/earn";

export async function GET() {
  try {
    const chains = await getChains();
    return NextResponse.json({ data: chains });
  } catch (error) {
    console.error("Earn chains API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chains" },
      { status: 500 }
    );
  }
}
