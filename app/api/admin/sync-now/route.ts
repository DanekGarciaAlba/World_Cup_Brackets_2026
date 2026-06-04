import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { syncWorldCup } from "@/lib/sync/syncWorldCup";

export async function POST() {
  await requireAdmin();
  const result = await syncWorldCup({ forced: true });
  return NextResponse.json(result);
}
