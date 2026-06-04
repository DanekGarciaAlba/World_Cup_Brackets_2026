import "server-only";
import { calculateMatchPoints } from "@/lib/scoring/calculateMatchPoints";
import { createAdminClient } from "@/lib/supabase/admin";

type FinishedMatch = {
  id: number;
  kickoff_at: string;
  home_score: number;
  away_score: number;
};

type MatchPredictionRow = {
  id: string;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  boost_applied: boolean;
  created_at: string;
  updated_at: string;
};

export async function recalculateLeaderboard() {
  const supabase = createAdminClient();

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id,kickoff_at,home_score,away_score")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .limit(150);

  if (matchesError) throw new Error(matchesError.message);

  const finishedMatches = (matches ?? []) as FinishedMatch[];
  const finishedById = new Map(finishedMatches.map((match) => [Number(match.id), match]));

  if (finishedMatches.length === 0) {
    return {
      ok: true,
      scoredPredictions: 0,
      leaderboardRows: 0,
      message: "No finished fixtures with scores yet. Leaderboard will score after results sync.",
    };
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("match_predictions")
    .select("id,user_id,match_id,home_score,away_score,boost_applied,created_at,updated_at")
    .in(
      "match_id",
      finishedMatches.map((match) => match.id),
    );

  if (predictionsError) throw new Error(predictionsError.message);

  const predictionRows = (predictions ?? []) as MatchPredictionRow[];
  const predictionIds = predictionRows.map((prediction) => prediction.id);

  if (predictionIds.length > 0) {
    const { error: deleteError } = await supabase.from("prediction_scores").delete().eq("prediction_type", "match").in("prediction_id", predictionIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  const scoreRows = predictionRows.flatMap((prediction) => {
    const match = finishedById.get(Number(prediction.match_id));
    if (!match) return [];

    const score = calculateMatchPoints(
      {
        homeScore: Number(prediction.home_score),
        awayScore: Number(prediction.away_score),
        boostApplied: Boolean(prediction.boost_applied),
        predictedAt: prediction.updated_at ?? prediction.created_at,
        kickoffAt: match.kickoff_at,
      },
      {
        homeScore: Number(match.home_score),
        awayScore: Number(match.away_score),
      },
    );

    return score.reasons.map((reason) => ({
      user_id: prediction.user_id,
      prediction_type: "match",
      prediction_id: prediction.id,
      points: reason.points,
      reason_code: reason.code,
      reason: reason.description,
      scored_at: new Date().toISOString(),
    }));
  });

  if (scoreRows.length > 0) {
    const { error: insertError } = await supabase.from("prediction_scores").insert(scoreRows);
    if (insertError) throw new Error(insertError.message);
  }

  const aggregates = new Map<
    string,
    {
      matchPoints: number;
      exactScores: number;
      correctOutcomes: number;
    }
  >();

  for (const row of scoreRows) {
    const aggregate = aggregates.get(row.user_id) ?? { matchPoints: 0, exactScores: 0, correctOutcomes: 0 };
    aggregate.matchPoints += row.points;
    if (row.reason_code === "exact_score") aggregate.exactScores += 1;
    if (row.reason_code === "correct_outcome") aggregate.correctOutcomes += 1;
    aggregates.set(row.user_id, aggregate);
  }

  const { data: existing } = await supabase.from("leaderboard_cache").select("user_id,current_rank");
  const previousRankByUserId = new Map((existing ?? []).map((row: any) => [String(row.user_id), Number(row.current_rank ?? 0)]));

  const leaderboardRows = Array.from(aggregates.entries())
    .map(([userId, aggregate]) => ({
      user_id: userId,
      total_points: aggregate.matchPoints,
      match_points: aggregate.matchPoints,
      group_points: 0,
      bracket_points: 0,
      bonus_points: 0,
      exact_scores: aggregate.exactScores,
      correct_outcomes: aggregate.correctOutcomes,
      current_rank: 0,
      previous_rank: previousRankByUserId.get(userId) || null,
      rank_change: 0,
      updated_at: new Date().toISOString(),
    }))
    .sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores);

  leaderboardRows.forEach((row, index) => {
    row.current_rank = index + 1;
    row.rank_change = row.previous_rank ? row.previous_rank - row.current_rank : 0;
  });

  if (leaderboardRows.length > 0) {
    const { error: upsertError } = await supabase.from("leaderboard_cache").upsert(leaderboardRows, { onConflict: "user_id" });
    if (upsertError) throw new Error(upsertError.message);
  }

  return {
    ok: true,
    scoredPredictions: predictionRows.length,
    scoreRows: scoreRows.length,
    leaderboardRows: leaderboardRows.length,
    message: `Scored ${predictionRows.length} predictions across ${finishedMatches.length} finished fixtures.`,
  };
}
