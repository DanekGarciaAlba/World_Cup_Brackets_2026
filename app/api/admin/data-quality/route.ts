import { NextResponse } from "next/server";
import { getWorldCupDataQuality } from "@/lib/data/worldCupValidation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const dataQuality = await getWorldCupDataQuality(supabase);
  return NextResponse.json(dataQuality);
}

export async function POST() {
  const supabase = createAdminClient();
  const dataQuality = await getWorldCupDataQuality(supabase);
  return NextResponse.json(dataQuality);
}
