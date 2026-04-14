import { NextResponse } from "next/server";
import { getProtocols } from "@/lib/api/earn";

export async function GET() {
  try {
    const protocols = await getProtocols();
    return NextResponse.json({ data: protocols });
  } catch (error) {
    console.error("Earn protocols API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch protocols" },
      { status: 500 }
    );
  }
}
