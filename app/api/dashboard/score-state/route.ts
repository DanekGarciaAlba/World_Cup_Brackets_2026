import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import type { RecentMatchScore } from "@/lib/scoring/recentMatchScores";
import { createAdminClient } from "@/lib/supabase/admin";

const MATCH_SCORE_HISTORY_LIMIT = 80;
const POINT_RELEASE_HISTORY_LIMIT = 40;

type RecentPointRelease = {
  id: string;
  label: string;
  body: string;
  points: number;
  scoredAt: string | null;
  sortAt: string | null;
  href: string;
  accent: "gold" | "green" | "blue";
};

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [{ data: stats, error: statsError }, { data: leaderboard, error: leaderboardError }] = await Promise.all([
    supabase
      .from("user_stats_cache")
      .select("total_points,today_points,exact_scores,correct_outcomes,current_rank,rank_change,last_points_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("leaderboard_cache")
      .select("total_points,today_points,exact_scores,correct_outcomes,current_rank,rank_change,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 });
  if (leaderboardError) return NextResponse.json({ error: leaderboardError.message }, { status: 500 });

  const source = (stats ?? leaderboard ?? {}) as Record<string, any>;
  const [recentMatchScores, recentPointReleases] = await Promise.all([
    getRecentMatchScores(supabase, user.id),
    getRecentPointReleases(supabase, user.id),
  ]);

  return NextResponse.json({
    userId: user.id,
    totalPoints: Number(source.total_points ?? 0),
    todayPoints: Number(source.today_points ?? 0),
    exactScores: Number(source.exact_scores ?? 0),
    correctOutcomes: Number(source.correct_outcomes ?? 0),
    rank: source.current_rank === null || source.current_rank === undefined ? null : Number(source.current_rank),
    rankChange: Number(source.rank_change ?? 0),
    lastPointsAt: typeof source.last_points_at === "string" ? source.last_points_at : null,
    updatedAt: typeof source.updated_at === "string" ? source.updated_at : null,
    recentMatchScores,
    recentPointReleases,
  });
}

function record(value: unknown): Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)) ? (value as Record<string, any>) : {};
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function getRecentPointReleases(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<RecentPointRelease[]> {
  const { data: scores, error } = await supabase
    .from("prediction_scores")
    .select("prediction_id,prediction_type,points,metadata,scored_at,calculated_at")
    .eq("user_id", userId)
    .in("prediction_type", ["bracket_group", "bracket_third_place"])
    .gt("points", 0)
    .order("scored_at", { ascending: false })
    .limit(POINT_RELEASE_HISTORY_LIMIT);

  if (error || !scores || scores.length === 0) return [];

  const groupPredictionIds = scores.filter((score: any) => score.prediction_type === "bracket_group").map((score: any) => String(score.prediction_id));
  const { data: groupPredictions } =
    groupPredictionIds.length > 0
      ? await supabase.from("group_predictions").select("id,group_name").in("id", groupPredictionIds)
      : { data: [] as any[] };
  const groupByPredictionId = new Map((groupPredictions ?? []).map((prediction: any) => [String(prediction.id), String(prediction.group_name ?? "")]));

  return scores
    .map((score: any): RecentPointRelease | null => {
      const points = Number(score.points ?? 0);
      if (!Number.isFinite(points) || points <= 0) return null;

      const scoredAt = typeof score.scored_at === "string" ? score.scored_at : typeof score.calculated_at === "string" ? score.calculated_at : null;
      const predictionId = String(score.prediction_id);
      const metadata = record(score.metadata);

      if (score.prediction_type === "bracket_group") {
        const groupName = groupByPredictionId.get(predictionId);
        const groupLetter = groupName?.match(/[A-L]$/i)?.[0]?.toUpperCase() ?? "?";
        return {
          id: `bracket_group:${predictionId}:${scoredAt ?? "pending"}`,
          label: `Group ${groupLetter} release`,
          body: `Group ${groupLetter} ranking points are ready to audit.`,
          points,
          scoredAt,
          sortAt: scoredAt,
          href: "/bracket",
          accent: "green",
        };
      }

      const correctTeams = numberOrNull(metadata.correctTeams);
      const perfectBonus = numberOrNull(metadata.perfectBonus);
      const bodyParts = [
        correctTeams !== null ? `${correctTeams}/8 correct teams` : "Top 8 third-place points are ready to audit",
        perfectBonus && perfectBonus > 0 ? `+${perfectBonus} perfect bonus` : null,
      ].filter(Boolean);

      return {
        id: `bracket_top8:${predictionId}:${scoredAt ?? "pending"}`,
        label: "Top 8 release",
        body: bodyParts.join(" / "),
        points,
        scoredAt,
        sortAt: scoredAt,
        href: "/bracket",
        accent: "gold",
      };
    })
    .filter((release): release is RecentPointRelease => Boolean(release));
}

async function getRecentMatchScores(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<RecentMatchScore[]> {
  const { data: scores, error } = await supabase
    .from("prediction_scores")
    .select("prediction_id,match_id,points,metadata,scored_at,calculated_at")
    .eq("user_id", userId)
    .eq("prediction_type", "daily_match")
    .not("match_id", "is", null)
    .order("scored_at", { ascending: false })
    .order("match_id", { ascending: false })
    .limit(MATCH_SCORE_HISTORY_LIMIT);

  if (error || !scores || scores.length === 0) return [];

  const predictionIds = scores.map((score: any) => String(score.prediction_id));
  const matchIds = scores.map((score: any) => Number(score.match_id)).filter(Number.isFinite);
  const [{ data: predictions }, { data: matches }] = await Promise.all([
    supabase.from("match_predictions").select("id,home_score,away_score").in("id", predictionIds),
    supabase
      .from("matches")
      .select("id,round,stage,group_name,kickoff_at,home_team_id,away_team_id,home_score,away_score")
      .in("id", matchIds),
  ]);

  const teamIds = new Set<number>();
  for (const match of matches ?? []) {
    const homeId = Number((match as any).home_team_id);
    const awayId = Number((match as any).away_team_id);
    if (Number.isFinite(homeId)) teamIds.add(homeId);
    if (Number.isFinite(awayId)) teamIds.add(awayId);
  }

  const { data: teams } =
    teamIds.size > 0
      ? await supabase.from("teams").select("id,name").in("id", Array.from(teamIds))
      : { data: [] as any[] };

  const predictionsById = new Map((predictions ?? []).map((prediction: any) => [String(prediction.id), prediction]));
  const matchesById = new Map((matches ?? []).map((match: any) => [Number(match.id), match]));
  const teamsById = new Map((teams ?? []).map((team: any) => [Number(team.id), team]));

  return scores
    .map((score: any) => {
      const matchId = Number(score.match_id);
      const match = matchesById.get(matchId);
      const prediction = predictionsById.get(String(score.prediction_id));
      if (!match || !prediction) return null;

      const metadata = (score.metadata ?? {}) as Record<string, any>;
      const homeTeam = teamsById.get(Number(match.home_team_id));
      const awayTeam = teamsById.get(Number(match.away_team_id));
      const actualScoreLabel =
        typeof metadata.actualScoreLabel === "string"
          ? metadata.actualScoreLabel
          : match.home_score !== null && match.away_score !== null
            ? `${match.home_score}-${match.away_score}`
            : "--";
      const predictedScoreLabel =
        typeof metadata.predictedScoreLabel === "string" ? metadata.predictedScoreLabel : `${prediction.home_score}-${prediction.away_score}`;

      return {
        matchId,
        matchLabel: String(match.group_name ?? match.stage ?? match.round ?? "Fixture"),
        kickoffAt: String(match.kickoff_at ?? ""),
        homeTeamName: String(homeTeam?.name ?? "Home"),
        awayTeamName: String(awayTeam?.name ?? "Away"),
        predictedScoreLabel,
        actualScoreLabel,
        points: Number(score.points ?? 0),
        exactScore: Boolean(metadata.exactScore),
        correctOutcome: Boolean(metadata.correctOutcome),
        timingMultiplier: Number.isFinite(Number(metadata.timingMultiplier)) ? Number(metadata.timingMultiplier) : null,
        scoredAt: typeof score.scored_at === "string" ? score.scored_at : typeof score.calculated_at === "string" ? score.calculated_at : null,
      } satisfies RecentMatchScore;
    })
    .filter((score): score is RecentMatchScore => Boolean(score))
    .sort((a, b) => {
      const kickoffDiff = new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime();
      if (Number.isFinite(kickoffDiff) && kickoffDiff !== 0) return kickoffDiff;
      const scoredDiff = new Date(b.scoredAt ?? "").getTime() - new Date(a.scoredAt ?? "").getTime();
      if (Number.isFinite(scoredDiff) && scoredDiff !== 0) return scoredDiff;
      return b.matchId - a.matchId;
    });
}
