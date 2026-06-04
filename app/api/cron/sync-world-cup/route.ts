import { NextResponse } from "next/server";
import { syncWorldCup } from "@/lib/sync/syncWorldCup";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncWorldCup();
  return NextResponse.json(result);
}
