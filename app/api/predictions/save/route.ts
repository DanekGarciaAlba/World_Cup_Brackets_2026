import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST() {
  await requireUser();
  return NextResponse.json(
    {
      ok: false,
      message: "Prediction save endpoint is scaffolded. Lock-aware writes come after table verification.",
    },
    { status: 501 },
  );
}
