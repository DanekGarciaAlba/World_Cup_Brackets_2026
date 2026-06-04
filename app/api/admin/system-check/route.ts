import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/system/status";

export async function GET() {
  const status = await getSystemStatus();
  return NextResponse.json({ status });
}
