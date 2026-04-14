import { NextRequest, NextResponse } from "next/server";
import { getAllVaults, getVaults } from "@/lib/api/earn";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const all = params.get("all") === "true";
    const chainId = params.get("chainId");
    const asset = params.get("asset");
    const protocol = params.get("protocol");
    const minTvl = params.get("minTvl") || params.get("minTvlUsd") || undefined;
    const sortBy = params.get("sortBy") || "apy";
    const limit = params.get("limit") || undefined;
    const cursor = params.get("cursor") || undefined;

    if (all) {
      const vaults = await getAllVaults(minTvl || "100000");
      return NextResponse.json({ data: vaults, count: vaults.length });
    }

    const response = await getVaults({
      chainId: chainId ? Number(chainId) : undefined,
      asset: asset || undefined,
      protocol: protocol || undefined,
      minTvl,
      sortBy,
      limit,
      cursor,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Earn vaults API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vaults" },
      { status: 500 }
    );
  }
}
