import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  await requireUser();
  return NextResponse.json({ matches: [] });
}
