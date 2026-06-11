import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const matchId = Number(request.nextUrl.searchParams.get("matchId"));
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Valid matchId required" }, { status: 400 });

  const supabase = createAdminClient();
  const [{ data: prediction, error: predictionError }, { data: match, error: matchError }] = await Promise.all([
    supabase
      .from("match_predictions")
      .select("id,match_id,home_score,away_score,predicted_advancer_team_id,updated_at,meaningful_updated_at")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id,round,stage,group_name,kickoff_at,status,home_team_id,away_team_id,home_score,away_score")
      .eq("id", matchId)
      .maybeSingle(),
  ]);

  if (predictionError) return NextResponse.json({ error: predictionError.message }, { status: 500 });
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (!prediction) {
    return NextResponse.json({
      matchId,
      matchLabel: String(match.group_name ?? match.stage ?? match.round ?? "Fixture"),
      status: String(match.status ?? "scheduled"),
      predictedScoreLabel: null,
      actualScoreLabel: scoreLabel(match.home_score, match.away_score),
      points: null,
      timingMultiplier: null,
      basePoints: null,
      finalPoints: null,
      exactScore: false,
      correctOutcome: false,
      reasons: [],
      savedAt: null,
      scoredAt: null,
    });
  }

  const { data: score, error: scoreError } = await supabase
    .from("prediction_scores")
    .select("points,reason,reason_code,metadata,scored_at,calculated_at")
    .eq("user_id", user.id)
    .eq("prediction_type", "daily_match")
    .eq("prediction_id", prediction.id)
    .maybeSingle();

  if (scoreError) return NextResponse.json({ error: scoreError.message }, { status: 500 });

  const metadata = (score?.metadata ?? {}) as Record<string, any>;

  return NextResponse.json({
    matchId,
    matchLabel: String(match.group_name ?? match.stage ?? match.round ?? "Fixture"),
    status: String(match.status ?? "scheduled"),
    predictedScoreLabel: `${prediction.home_score}-${prediction.away_score}`,
    actualScoreLabel:
      typeof metadata.actualScoreLabel === "string" ? metadata.actualScoreLabel : scoreLabel(match.home_score, match.away_score),
    points: score ? Number(score.points ?? 0) : null,
    timingMultiplier: finiteNumber(metadata.timingMultiplier),
    basePoints: finiteNumber(metadata.basePoints),
    finalPoints: finiteNumber(metadata.finalPoints),
    exactScore: Boolean(metadata.exactScore),
    correctOutcome: Boolean(metadata.correctOutcome),
    reasons: Array.isArray(metadata.reasons) ? metadata.reasons : [],
    savedAt:
      typeof prediction.meaningful_updated_at === "string"
        ? prediction.meaningful_updated_at
        : typeof prediction.updated_at === "string"
          ? prediction.updated_at
          : null,
    scoredAt: typeof score?.scored_at === "string" ? score.scored_at : typeof score?.calculated_at === "string" ? score.calculated_at : null,
  });
}

function finiteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreLabel(home: unknown, away: unknown) {
  return typeof home === "number" && typeof away === "number" ? `${home}-${away}` : null;
}
