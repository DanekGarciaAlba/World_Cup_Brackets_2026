import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { recalculateLeaderboard } from "@/lib/scoring/recalculateLeaderboard";

export async function POST() {
  await requireAdmin();
  const result = await recalculateLeaderboard();
  return NextResponse.json(result);
}
