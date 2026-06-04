import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMatchLocked } from "@/lib/utils/locks";

const savePredictionSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(12),
  awayScore: z.coerce.number().int().min(0).max(12),
  boostApplied: z.boolean().optional().default(false),
});

const cancelPredictionSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

async function getEditableMatch(matchId: number) {
  const supabase = createAdminClient();
  const { data: match, error } = await supabase.from("matches").select("id,kickoff_at,status").eq("id", matchId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!match) return { error: NextResponse.json({ error: "Fixture not found. Run Admin Sync first." }, { status: 404 }) };
  if (isMatchLocked(match)) {
    return { error: NextResponse.json({ error: "This fixture is locked. Picks can no longer be changed." }, { status: 409 }) };
  }

  return { match };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = savePredictionSchema.parse(await request.json());
    const editable = await getEditableMatch(payload.matchId);
    if (editable.error) return editable.error;

    const supabase = createAdminClient();

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name: user.email?.split("@")[0] ?? "Player",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    const { data, error } = await supabase
      .from("match_predictions")
      .upsert(
        {
          user_id: user.id,
          match_id: payload.matchId,
          home_score: payload.homeScore,
          away_score: payload.awayScore,
          boost_applied: payload.boostApplied,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_id" },
      )
      .select("id,match_id,home_score,away_score,boost_applied,updated_at,created_at")
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("leaderboard_cache").upsert(
      {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ ok: true, prediction: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid prediction payload." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Sign in before saving picks." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save prediction." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = cancelPredictionSchema.parse(await request.json());
    const editable = await getEditableMatch(payload.matchId);
    if (editable.error) return editable.error;

    const supabase = createAdminClient();
    const { error } = await supabase.from("match_predictions").delete().eq("user_id", user.id).eq("match_id", payload.matchId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, cancelled: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid cancel payload." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Sign in before cancelling picks." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel prediction." }, { status: 500 });
  }
}
