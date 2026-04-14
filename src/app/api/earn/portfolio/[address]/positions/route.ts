import { NextRequest, NextResponse } from "next/server";
import { getPositions } from "@/lib/api/earn";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const positions = await getPositions(address);
    return NextResponse.json(
      { data: positions },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Earn positions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
