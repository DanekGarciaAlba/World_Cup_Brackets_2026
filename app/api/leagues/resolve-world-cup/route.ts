import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { findWorldCupLeagueCandidates } from "@/lib/providers/resolveWorldCupLeague";

export async function GET() {
  await requireAdmin();
  const candidates = await findWorldCupLeagueCandidates();
  return NextResponse.json({ candidates });
}
