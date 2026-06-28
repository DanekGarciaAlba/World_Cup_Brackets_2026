import "server-only";
import { calculateRankedClubRows } from "@/lib/clubs/ranking";
import { mergeMascotIds, normalizeMascotList } from "@/lib/mascots/lockerState";
import { normalizeMascotId } from "@/lib/mascots/mascotCatalog";
import { getFinalMatchKickoffAt } from "@/lib/mascots/server";
import { calculateCorrectOutcomeStreaks, type MascotStreakInput } from "@/lib/mascots/streaks";
import { isWorldCupFinalWeek, resolveMascotUnlocks } from "@/lib/mascots/unlocks";
import { calculateBracketPoints, calculateBracketSegmentPoints } from "@/lib/scoring/calculateBracketPoints";
import { calculateGroupPredictionPoints } from "@/lib/scoring/calculateGroupPredictionPoints";
import { calculateMatchPoints, isAdvancerScoringStage, matchOutcome } from "@/lib/scoring/calculateMatchPoints";
import { deriveWorldCupDeadlines } from "@/lib/scoring/deadlines";
import { isCompetitiveHiddenEmail, SYSTEM_ADMIN_EMAILS } from "@/lib/profile/cosmeticAccess";
import { assignKnockoutMatchNumbers, knockoutKickoffByMatchNo } from "@/lib/bracket/tournamentPathRules";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages, insertInChunks } from "@/lib/supabase/pagination";

type FinishedMatch = {
  id: number;
  kickoff_at: string;
  round: string | null;
  group_name: string | null;
  stage: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number;
  away_score: number;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
};

type MatchPredictionRow = {
  id: string;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  predicted_advancer_team_id: number | null;
  boost_applied: boolean;
  meaningful_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type GroupPredictionRow = {
  id: string;
  user_id: string;
  group_name: string;
  winner_team_id: number | null;
  runner_up_team_id: number | null;
  third_place_team_id: number | null;
  ranking_team_ids?: number[] | null;
  meaningful_updated_at?: string | null;
  created_at: string;
  updated_at: string;
};

type StandingScoreRow = {
  group_name: string | null;
  team_id: number | null;
  rank: number | null;
  points: number | null;
  goal_difference: number | null;
  goals_for: number | null;
};

type TournamentPredictionRow = {
  id: string;
  user_id: string;
  champion_team_id: number | null;
  finalist_team_ids: number[];
  semi_finalist_team_ids: number[];
  path: {
    roundOf32?: number[];
    roundOf16?: number[];
    quarterFinalists?: number[];
    semiFinalists?: number[];
    finalists?: number[];
    champion?: number | null;
    thirdPlaceWinner?: number | null;
    groupRankings?: Record<string, number[]>;
    thirdPlaceGroups?: string[];
    top8TeamIds?: number[];
    top8GroupSavedAtByLetter?: Record<string, string | null>;
    winnersByMatch?: Record<string, number | null>;
    knockoutSavedAtByMatchNo?: Record<string, string | null>;
  } | null;
  top8_submitted_at?: string | null;
  knockout_submitted_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ScoreRow = {
  user_id: string;
  prediction_type:
    | "daily_match"
    | "bracket_group"
    | "bracket_third_place"
    | "bracket_knockout"
    | "bracket_champion"
    | "bonus_perfect_matchday"
    | "bonus_exact_score_streak"
    | "bonus_outcome_streak";
  prediction_id: string;
  match_id: number | null;
  points: number;
  reason_code: string;
  reason: string;
  metadata: Record<string, unknown>;
  scored_at: string;
  calculated_at: string;
};

type LeaderboardAggregate = {
  dailyPoints: number;
  bracketPoints: number;
  bonusPoints: number;
  todayPoints: number;
  exactScores: number;
  correctOutcomes: number;
  lastPointsAt: string | null;
  scoringTieBreakerAt: string | null;
};

type PredictionTimestamp = {
  count: number;
  lastPredictionAt: string | null;
};

function winnerTeamId(match: FinishedMatch) {
  if (match.home_team_id === null || match.away_team_id === null) return null;
  if (match.home_score > match.away_score) return Number(match.home_team_id);
  if (match.away_score > match.home_score) return Number(match.away_team_id);
  if (match.penalty_home_score !== null && match.penalty_away_score !== null) {
    if (match.penalty_home_score > match.penalty_away_score) return Number(match.home_team_id);
    if (match.penalty_away_score > match.penalty_home_score) return Number(match.away_team_id);
  }
  return null;
}

function knockoutRoundKey(match: Pick<FinishedMatch, "round" | "stage">) {
  const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
  if (text.includes("round of 32")) return "roundOf32";
  if (text.includes("round of 16")) return "roundOf16";
  if (text.includes("quarter")) return "quarterFinals";
  if (text.includes("semi")) return "semiFinals";
  if (text.includes("third")) return "thirdPlace";
  if (/\bfinal\b/.test(text) && !text.includes("semi") && !text.includes("third")) return "final";
  return null;
}

function setValues(set: Set<number>) {
  return Array.from(set.values());
}

function chooseActualParticipants(preferred: Set<number>, fallback: Set<number>) {
  return preferred.size > 0 ? setValues(preferred) : setValues(fallback);
}

function actualTournamentResultFromMatches(finishedMatches: FinishedMatch[], allMatches: Array<FinishedMatch | any> = finishedMatches) {
  const participants = {
    roundOf32: new Set<number>(),
    roundOf16: new Set<number>(),
    quarterFinals: new Set<number>(),
    semiFinals: new Set<number>(),
    final: new Set<number>(),
  };
  const winners = {
    roundOf32: new Set<number>(),
    roundOf16: new Set<number>(),
    quarterFinals: new Set<number>(),
    semiFinals: new Set<number>(),
    final: new Set<number>(),
  };
  let thirdPlaceWinnerTeamId: number | null = null;
  const matchNoById = new Map(assignKnockoutMatchNumbers(allMatches).map(({ matchNo, match }) => [Number((match as any).id), matchNo]));
  const winnersByMatch: Record<string, number> = {};

  for (const match of finishedMatches) {
    const roundKey = knockoutRoundKey(match);
    if (!roundKey) continue;

    const winner = winnerTeamId(match);
    const matchNo = matchNoById.get(Number(match.id));
    if (matchNo && winner !== null) winnersByMatch[String(matchNo)] = winner;
    if (roundKey === "thirdPlace") {
      thirdPlaceWinnerTeamId = winner;
      continue;
    }

    if (match.home_team_id !== null) participants[roundKey].add(Number(match.home_team_id));
    if (match.away_team_id !== null) participants[roundKey].add(Number(match.away_team_id));
    if (winner !== null) winners[roundKey].add(winner);
  }

  return {
    roundOf32TeamIds: setValues(participants.roundOf32),
    roundOf16TeamIds: chooseActualParticipants(participants.roundOf16, winners.roundOf32),
    quarterFinalistTeamIds: chooseActualParticipants(participants.quarterFinals, winners.roundOf16),
    semiFinalistTeamIds: chooseActualParticipants(participants.semiFinals, winners.quarterFinals),
    finalistTeamIds: chooseActualParticipants(participants.final, winners.semiFinals),
    championTeamId: setValues(winners.final)[0] ?? null,
    thirdPlaceWinnerTeamId,
    winnersByMatch,
  };
}

function normalizeTeamIdArray(values: unknown) {
  return Array.isArray(values)
    ? values
        .filter((value) => value !== null && value !== undefined)
        .map(Number)
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];
}

function normalizeNullableNumberRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => {
        const matchNo = Number(key);
        const teamId = Number(item);
        return Number.isInteger(matchNo) && matchNo >= 73 && matchNo <= 104 && Number.isFinite(teamId) && teamId > 0
          ? [String(matchNo), teamId]
          : null;
      })
      .filter((entry): entry is [string, number] => Boolean(entry)),
  );
}

function firstKickoffByGroup(matches: Array<{ group_name: string | null; kickoff_at: string }>) {
  const groups = new Map<string, string>();

  for (const match of matches) {
    if (!match.group_name) continue;
    const current = groups.get(match.group_name);
    if (!current || new Date(match.kickoff_at).getTime() < new Date(current).getTime()) {
      groups.set(match.group_name, match.kickoff_at);
    }
  }

  return groups;
}

function firstRoundKickoffsByGroup(matches: Array<{ group_name: string | null; kickoff_at: string }>) {
  const grouped = new Map<string, string[]>();
  for (const match of matches) {
    if (!match.group_name) continue;
    const rows = grouped.get(match.group_name) ?? [];
    rows.push(match.kickoff_at);
    grouped.set(match.group_name, rows);
  }

  const result = new Map<string, [string | null, string | null]>();
  for (const [groupName, kickoffs] of grouped.entries()) {
    const sorted = kickoffs.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    result.set(groupName, [sorted[0] ?? null, sorted[1] ?? null]);
  }
  return result;
}

function matchStageForScoring(match: Pick<FinishedMatch, "round" | "stage" | "group_name">) {
  if (match.group_name) return "group";
  return `${match.round ?? ""} ${match.stage ?? ""}`;
}

function completedGroupNames(matches: Array<{ group_name: string | null; status: string | null }>) {
  const groups = new Map<string, { total: number; finished: number }>();

  for (const match of matches) {
    if (!match.group_name) continue;
    const current = groups.get(match.group_name) ?? { total: 0, finished: 0 };
    current.total += 1;
    if (match.status === "finished") current.finished += 1;
    groups.set(match.group_name, current);
  }

  return new Set(
    Array.from(groups.entries())
      .filter(([, value]) => value.total >= 6 && value.finished === value.total)
      .map(([groupName]) => groupName),
  );
}

function isOfficialWorldCupGroup(groupName: string | null | undefined) {
  return typeof groupName === "string" && /^Group [A-L]$/.test(groupName);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareThirdPlaceCriteria(
  a: { points: number; goalDifference: number; goalsFor: number },
  b: { points: number; goalDifference: number; goalsFor: number },
) {
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
}

function actualThirdPlaceQualifierIds(standings: StandingScoreRow[]) {
  const thirdPlaceRows = standings
    .map((standing) => ({
      teamId: numberOrNull(standing.team_id),
      rank: numberOrNull(standing.rank),
      points: numberOrNull(standing.points),
      goalDifference: numberOrNull(standing.goal_difference),
      goalsFor: numberOrNull(standing.goals_for),
    }))
    .filter(
      (standing): standing is { teamId: number; rank: number; points: number; goalDifference: number; goalsFor: number } =>
        standing.teamId !== null &&
        standing.rank === 3 &&
        standing.points !== null &&
        standing.goalDifference !== null &&
        standing.goalsFor !== null,
    );

  if (thirdPlaceRows.length < 12) return new Set<number>();

  const sorted = [...thirdPlaceRows].sort((a, b) => compareThirdPlaceCriteria(a, b) || a.teamId - b.teamId);
  const cutoff = sorted[7];
  const next = sorted[8];
  if (!cutoff || !next) return new Set<number>();
  if (compareThirdPlaceCriteria(cutoff, next) === 0) return new Set<number>();

  return new Set(sorted.slice(0, 8).map((standing) => standing.teamId));
}

function isoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function latestIso(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function profileCreatedTime(value: unknown) {
  const time = typeof value === "string" ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function submittedAtFromScore(row: ScoreRow) {
  return typeof row.metadata.submittedAt === "string" ? row.metadata.submittedAt : null;
}

async function exactCount(label: string, query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return count ?? 0;
}

function assertCompleteRead(label: string, expected: number, actual: number) {
  if (expected !== actual) {
    throw new Error(`${label}: expected ${expected} rows but fetched ${actual}. Recalculation aborted to prevent a partial leaderboard rebuild.`);
  }
}

async function deleteScoreRows(predictionTypes: string[], predictionIds: string[]) {
  if (predictionIds.length === 0) return;
  const supabase = createAdminClient();
  const uniquePredictionIds = Array.from(new Set(predictionIds));
  for (let index = 0; index < uniquePredictionIds.length; index += 150) {
    const chunk = uniquePredictionIds.slice(index, index + 150);
    const { error } = await supabase.from("prediction_scores").delete().in("prediction_type", predictionTypes).in("prediction_id", chunk);
    if (error) throw new Error(error.message);
  }
}

async function getTournamentLockFallback(firstKickoffAt: string | null) {
  if (firstKickoffAt) return firstKickoffAt;
  const supabase = createAdminClient();
  const { data } = await supabase.from("system_settings").select("value").eq("key", "bracket_lock_at").maybeSingle();
  const raw = (data as any)?.value;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.value === "string") return raw.value;
  return null;
}

function addPredictionTimestamp(map: Map<string, PredictionTimestamp>, userId: string, updatedAt: string | null) {
  const current = map.get(userId) ?? { count: 0, lastPredictionAt: null };
  current.count += 1;
  current.lastPredictionAt = latestIso(current.lastPredictionAt, updatedAt);
  map.set(userId, current);
}

function defaultAggregate(): LeaderboardAggregate {
  return {
    dailyPoints: 0,
    bracketPoints: 0,
    bonusPoints: 0,
    todayPoints: 0,
    exactScores: 0,
    correctOutcomes: 0,
    lastPointsAt: null,
    scoringTieBreakerAt: null,
  };
}

function applyScoreToAggregate(aggregate: LeaderboardAggregate, row: ScoreRow, today: string) {
  if (row.prediction_type === "daily_match") aggregate.dailyPoints += row.points;
  if (row.prediction_type.startsWith("bracket_")) aggregate.bracketPoints += row.points;
  if (row.prediction_type.startsWith("bonus_")) aggregate.bonusPoints += row.points;
  if (row.metadata.matchdayDate === today) aggregate.todayPoints += row.points;
  if (row.metadata.exactScore === true) aggregate.exactScores += 1;
  if (row.metadata.correctOutcome === true) aggregate.correctOutcomes += 1;
  if (row.points > 0) {
    aggregate.lastPointsAt = latestIso(aggregate.lastPointsAt, row.calculated_at);
    aggregate.scoringTieBreakerAt = latestIso(aggregate.scoringTieBreakerAt, submittedAtFromScore(row));
  }
}

export async function rebuildRankedClubsCacheOnly() {
  const supabase = createAdminClient();
  const calculatedAt = new Date().toISOString();
  const [leagues, members, leaderboard, existingRankedClubs] = await Promise.all([
    fetchAllPages<any>((from, to) => supabase.from("mini_leagues").select("id,name").order("id", { ascending: true }).range(from, to)),
    fetchAllPages<any>((from, to) =>
      supabase.from("mini_league_members").select("mini_league_id,user_id").order("mini_league_id", { ascending: true }).order("user_id", { ascending: true }).range(from, to),
    ),
    fetchAllPages<any>((from, to) => supabase.from("leaderboard_cache").select("user_id,total_points").order("user_id", { ascending: true }).range(from, to)),
    fetchAllPages<any>((from, to) => supabase.from("ranked_mini_leagues_cache").select("mini_league_id,current_rank").order("mini_league_id", { ascending: true }).range(from, to)),
  ]);

  const memberUserIds = Array.from(new Set(members.map((member) => String(member.user_id))));
  const { data: memberProfiles } =
    memberUserIds.length > 0 ? await supabase.from("profiles").select("id,email").in("id", memberUserIds) : { data: [] };
  const hiddenCompetitiveUserIds = new Set(
    (memberProfiles ?? []).filter((profile: any) => isCompetitiveHiddenEmail(profile.email)).map((profile: any) => String(profile.id)),
  );
  const previousRankByLeagueId = new Map(existingRankedClubs.map((row: any) => [String(row.mini_league_id), Number(row.current_rank ?? 0)]));
  const pointsByUserId = new Map(leaderboard.map((row: any) => [String(row.user_id), Number(row.total_points ?? 0)]));
  const rows = calculateRankedClubRows({
    leagues: leagues.map((league) => ({ id: String(league.id), name: String(league.name ?? "Club") })),
    members: members.map((member) => ({ mini_league_id: String(member.mini_league_id), user_id: String(member.user_id) })),
    pointsByUserId,
    previousRankByLeagueId,
    excludedUserIds: hiddenCompetitiveUserIds,
  }).map((row) => ({ ...row, updated_at: calculatedAt }));

  const { error: deleteError } = await supabase.from("ranked_mini_leagues_cache").delete().not("mini_league_id", "is", null);
  if (deleteError) throw new Error(deleteError.message);
  if (rows.length > 0) {
    await insertInChunks("ranked_mini_leagues_cache", rows, (chunk) => supabase.from("ranked_mini_leagues_cache").insert(chunk));
  }
  return { rows: rows.length };
}

export async function recalculateLeaderboard() {
  const supabase = createAdminClient();
  const calculatedAt = new Date().toISOString();
  const today = isoDate(calculatedAt);

  const { data: allMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id,kickoff_at,round,group_name,stage,status,home_team_id,away_team_id,home_score,away_score,penalty_home_score,penalty_away_score")
    .order("kickoff_at", { ascending: true })
    .limit(220);

  if (matchesError) throw new Error(matchesError.message);

  const finishedMatches = ((allMatches ?? []) as any[])
    .filter((match) => match.status === "finished" && match.home_score !== null && match.away_score !== null)
    .map((match) => ({
      ...match,
      id: Number(match.id),
      home_team_id: match.home_team_id === null ? null : Number(match.home_team_id),
      away_team_id: match.away_team_id === null ? null : Number(match.away_team_id),
      home_score: Number(match.home_score),
      away_score: Number(match.away_score),
      penalty_home_score: match.penalty_home_score === null ? null : Number(match.penalty_home_score),
      penalty_away_score: match.penalty_away_score === null ? null : Number(match.penalty_away_score),
    })) as FinishedMatch[];
  const finishedById = new Map(finishedMatches.map((match) => [Number(match.id), match]));
  const deadlines = deriveWorldCupDeadlines((allMatches ?? []) as any[]);
  const finishedMatchIds = finishedMatches.map((match) => match.id);

  const predictionRows =
    finishedMatches.length > 0
      ? await fetchAllPages<MatchPredictionRow>((from, to) =>
          supabase
            .from("match_predictions")
            .select("id,user_id,match_id,home_score,away_score,predicted_advancer_team_id,boost_applied,meaningful_updated_at,created_at,updated_at")
            .in(
              "match_id",
              finishedMatchIds,
            )
            .order("match_id", { ascending: true })
            .order("user_id", { ascending: true })
            .range(from, to),
        )
      : [];
  const expectedPredictionRows =
    finishedMatchIds.length > 0
      ? await exactCount(
          "match_predictions finished-match count",
          supabase.from("match_predictions").select("id", { count: "exact", head: true }).in("match_id", finishedMatchIds),
        )
      : 0;
  assertCompleteRead("match_predictions finished-match read", expectedPredictionRows, predictionRows.length);
  await deleteScoreRows(
    ["daily_match", "match"],
    predictionRows.map((prediction) => prediction.id),
  );

  const predictionTimestamps = new Map<string, PredictionTimestamp>();
  const dailyScoreRows: ScoreRow[] = predictionRows.flatMap((prediction) => {
    const match = finishedById.get(Number(prediction.match_id));
    if (!match) return [];

    const submittedAt = prediction.meaningful_updated_at ?? prediction.updated_at ?? prediction.created_at;
    addPredictionTimestamp(predictionTimestamps, prediction.user_id, submittedAt);

    const penaltyWinner = winnerTeamId(match);
    const score = calculateMatchPoints(
      {
        homeScore: Number(prediction.home_score),
        awayScore: Number(prediction.away_score),
        boostApplied: Boolean(prediction.boost_applied),
        predictedAt: submittedAt,
        kickoffAt: match.kickoff_at,
        predictedAdvancerTeamId: prediction.predicted_advancer_team_id,
        stage: matchStageForScoring(match),
      },
      {
        homeScore: Number(match.home_score),
        awayScore: Number(match.away_score),
        winnerTeamId: penaltyWinner,
        penaltyWinnerTeamId: match.penalty_home_score !== null && match.penalty_away_score !== null ? penaltyWinner : null,
      },
    );
    const exactScore = prediction.home_score === match.home_score && prediction.away_score === match.away_score;
    const useAdvancerOutcome =
      isAdvancerScoringStage(matchStageForScoring(match)) && prediction.predicted_advancer_team_id !== null && penaltyWinner !== null;
    const correctOutcome = useAdvancerOutcome
      ? Number(prediction.predicted_advancer_team_id) === penaltyWinner
      : matchOutcome(prediction.home_score, prediction.away_score) === matchOutcome(match.home_score, match.away_score);
    const reasonCode = score.total > 0 ? (exactScore ? "daily_exact_score" : "daily_match_points") : (score.reasons[0]?.code ?? "daily_no_points");

    return [
      {
        user_id: prediction.user_id,
        prediction_type: "daily_match",
        prediction_id: prediction.id,
        match_id: match.id,
        points: score.total,
        reason_code: reasonCode,
        reason: score.total > 0 ? "Daily match prediction scored" : score.reasons[0]?.description ?? "No daily match points",
        metadata: {
          basePoints: score.basePoints,
          finalPoints: score.total,
          reasons: score.reasons,
          timingBucket: score.timing.bucket,
          timingMultiplier: score.timing.multiplier,
          timingMultiplierBP: score.timing.multiplierBP,
          stage: score.stage,
          eligible: score.timing.eligible,
          hoursBeforeDeadline: score.timing.hoursBeforeDeadline,
          exactScore,
          correctOutcome,
          predictedScoreLabel: `${prediction.home_score}-${prediction.away_score}`,
          actualScoreLabel: `${match.home_score}-${match.away_score}`,
          matchdayDate: isoDate(match.kickoff_at),
          submittedAt,
        },
        scored_at: calculatedAt,
        calculated_at: calculatedAt,
      } satisfies ScoreRow,
    ];
  });
  assertCompleteRead("daily_match score row build", predictionRows.length, dailyScoreRows.length);

  const firstRoundKickoffs = firstRoundKickoffsByGroup((allMatches ?? []) as Array<{ group_name: string | null; kickoff_at: string }>);
  const completedGroups = completedGroupNames((allMatches ?? []) as Array<{ group_name: string | null; status: string | null }>);
  const { data: standings, error: standingsError } = await supabase
    .from("standings")
    .select("group_name,team_id,rank,points,goal_difference,goals_for")
    .not("group_name", "is", null)
    .not("rank", "is", null);

  if (standingsError) throw new Error(standingsError.message);

  const standingRows = (standings ?? []) as StandingScoreRow[];
  const officialGroupStandingRows = standingRows.filter((standing) => isOfficialWorldCupGroup(standing.group_name));
  const thirdPlaceQualifierTeamIds = completedGroups.size === 12 ? actualThirdPlaceQualifierIds(officialGroupStandingRows) : new Set<number>();
  const actualGroups = new Map<string, number[]>();
  const officialGroupByTeamId = new Map<number, string>();
  for (const standing of officialGroupStandingRows) {
    const groupName = String(standing.group_name ?? "");
    if (!groupName) continue;
    const teamId = numberOrNull(standing.team_id);
    const groupLetter = groupName.replace(/^Group\s+/i, "");
    if (teamId !== null && /^[A-L]$/.test(groupLetter)) officialGroupByTeamId.set(teamId, groupLetter);
    const rows = actualGroups.get(groupName) ?? [];
    rows[Number(standing.rank) - 1] = Number(standing.team_id);
    actualGroups.set(groupName, rows);
  }

  const groupPredictionRows = await fetchAllPages<GroupPredictionRow>((from, to) =>
    supabase
      .from("group_predictions")
      .select("id,user_id,group_name,winner_team_id,runner_up_team_id,third_place_team_id,ranking_team_ids,meaningful_updated_at,created_at,updated_at")
      .order("group_name", { ascending: true })
      .order("user_id", { ascending: true })
      .range(from, to),
  );
  const expectedGroupPredictionRows = await exactCount(
    "group_predictions count",
    supabase.from("group_predictions").select("id", { count: "exact", head: true }),
  );
  assertCompleteRead("group_predictions read", expectedGroupPredictionRows, groupPredictionRows.length);
  await deleteScoreRows(
    ["bracket_group", "group"],
    groupPredictionRows.map((prediction) => prediction.id),
  );

  const groupScoreRows: ScoreRow[] = groupPredictionRows.flatMap((prediction) => {
    const submittedAt = prediction.meaningful_updated_at ?? prediction.updated_at ?? prediction.created_at;
    addPredictionTimestamp(predictionTimestamps, prediction.user_id, submittedAt);
    if (!completedGroups.has(prediction.group_name)) return [];
    const actualTeamIds = actualGroups.get(prediction.group_name)?.filter(Boolean) ?? [];
    if (actualTeamIds.length < 3) return [];

    const predictedTeamIds =
      normalizeTeamIdArray(prediction.ranking_team_ids).length > 0
        ? normalizeTeamIdArray(prediction.ranking_team_ids)
        : normalizeTeamIdArray([prediction.winner_team_id, prediction.runner_up_team_id, prediction.third_place_team_id]);
    const groupKickoffs = firstRoundKickoffs.get(prediction.group_name) ?? [null, null];
    const score = calculateGroupPredictionPoints({
      predictedTeamIds,
      actualTeamIds,
      predictedAt: submittedAt,
      groupCutoffAt: deadlines.groupCutoffAt,
      firstRoundKickoffA: groupKickoffs[0],
      firstRoundKickoffB: groupKickoffs[1],
    });

    return [
      {
        user_id: prediction.user_id,
        prediction_type: "bracket_group",
        prediction_id: prediction.id,
        match_id: null,
        points: score.total,
        reason_code: score.total > 0 ? "bracket_group_scored" : (score.reasons[0]?.code ?? "bracket_group_no_points"),
        reason: score.total > 0 ? "Group ranking prediction scored" : score.reasons[0]?.description ?? "No group prediction points",
        metadata: {
          basePoints: score.basePoints,
          finalPoints: score.total,
          reasons: score.reasons,
          timingBucket: score.timing.bucket,
          timingMultiplier: score.timing.multiplier,
          timingMultiplierBP: score.timing.multiplierBP,
          pointValues: score.pointValues,
          eligible: score.timing.eligible,
          hoursBeforeDeadline: score.timing.hoursBeforeDeadline,
          groupName: prediction.group_name,
          submittedAt,
          deadlineAt: deadlines.groupCutoffAt,
        },
        scored_at: calculatedAt,
        calculated_at: calculatedAt,
      } satisfies ScoreRow,
    ];
  });

  const actualTournamentResult = actualTournamentResultFromMatches(finishedMatches, (allMatches ?? []) as any[]);
  const knockoutMatchKickoffsByNo = knockoutKickoffByMatchNo((allMatches ?? []) as any[]);
  const hasTournamentResults =
    actualTournamentResult.roundOf16TeamIds.length > 0 ||
    actualTournamentResult.quarterFinalistTeamIds.length > 0 ||
    actualTournamentResult.semiFinalistTeamIds.length > 0 ||
    actualTournamentResult.finalistTeamIds.length > 0 ||
    actualTournamentResult.championTeamId !== null ||
    actualTournamentResult.thirdPlaceWinnerTeamId !== null ||
    Object.keys(actualTournamentResult.winnersByMatch).length > 0;

  const tournamentPredictionRows = await fetchAllPages<TournamentPredictionRow>((from, to) =>
    supabase
      .from("tournament_predictions")
      .select("id,user_id,champion_team_id,finalist_team_ids,semi_finalist_team_ids,path,top8_submitted_at,knockout_submitted_at,created_at,updated_at")
      .order("user_id", { ascending: true })
      .range(from, to),
  );
  const expectedTournamentPredictionRows = await exactCount(
    "tournament_predictions count",
    supabase.from("tournament_predictions").select("id", { count: "exact", head: true }),
  );
  assertCompleteRead("tournament_predictions read", expectedTournamentPredictionRows, tournamentPredictionRows.length);
  await deleteScoreRows(
    ["bracket_third_place", "bracket_knockout", "bracket_champion", "tournament"],
    tournamentPredictionRows.map((prediction) => prediction.id),
  );

  const top8ScoreRows: ScoreRow[] =
    thirdPlaceQualifierTeamIds.size === 8
      ? tournamentPredictionRows.flatMap((prediction) => {
          const submittedAt = prediction.top8_submitted_at;
          if (!submittedAt) return [];
          addPredictionTimestamp(predictionTimestamps, prediction.user_id, submittedAt);
          const path = prediction.path ?? {};
          const predictedTeamIds = normalizeTeamIdArray(path.top8TeamIds ?? []);
          if (predictedTeamIds.length !== 8) return [];
          const savedAtByGroup = path.top8GroupSavedAtByLetter ?? {};
          const top8PickSavedAtByTeamId = Object.fromEntries(
            predictedTeamIds.map((teamId) => {
              const group = officialGroupByTeamId.get(teamId);
              return [String(teamId), group ? savedAtByGroup[group] ?? submittedAt : submittedAt];
            }),
          );
          const score = calculateBracketSegmentPoints({
            kind: "top8",
            predictedTeamIds,
            actualTeamIds: Array.from(thirdPlaceQualifierTeamIds),
            submittedAt,
            top8PickSavedAtByTeamId,
            lockAt: deadlines.top8LockAt,
          });

          return [
            {
              user_id: prediction.user_id,
              prediction_type: "bracket_third_place",
              prediction_id: prediction.id,
              match_id: null,
              points: score.total,
              reason_code: score.total > 0 ? "top8_third_place_scored" : (score.timing.bucket ?? "top8_no_points"),
              reason: score.total > 0 ? "Top 8 third-place prediction scored" : "No Top 8 third-place points",
              metadata: {
                basePoints: score.basePoints,
                finalPoints: score.total,
                reasons: score.reasons ?? [],
                correctTeams: score.correctTeams ?? 0,
                perfectBonus: score.perfectBonus ?? 0,
                pickDetails: score.pickDetails ?? [],
                pointSystem: "fixed_top8_windows_v1",
                timingBucket: score.timing.bucket,
                timingMultiplier: score.timing.multiplier,
                timingMultiplierBP: score.timing.multiplierBP,
                eligible: score.timing.eligible,
                hoursBeforeDeadline: score.timing.hoursBeforeDeadline,
                submittedAt,
                deadlineAt: deadlines.top8LockAt,
              },
              scored_at: calculatedAt,
              calculated_at: calculatedAt,
            } satisfies ScoreRow,
          ];
        })
      : [];

  const tournamentScoreRows: ScoreRow[] = hasTournamentResults
    ? tournamentPredictionRows.flatMap((prediction) => {
        const submittedAt = prediction.knockout_submitted_at ?? prediction.updated_at ?? prediction.created_at;
        addPredictionTimestamp(predictionTimestamps, prediction.user_id, submittedAt);
        const score = calculateBracketPoints(
          {
            roundOf32TeamIds: normalizeTeamIdArray(prediction.path?.roundOf32),
            roundOf16TeamIds: normalizeTeamIdArray(prediction.path?.roundOf16),
            quarterFinalistTeamIds: normalizeTeamIdArray(prediction.path?.quarterFinalists),
            semiFinalistTeamIds: normalizeTeamIdArray(prediction.path?.semiFinalists ?? prediction.semi_finalist_team_ids),
            finalistTeamIds: normalizeTeamIdArray(prediction.path?.finalists ?? prediction.finalist_team_ids),
            championTeamId: Number(prediction.path?.champion ?? prediction.champion_team_id) || null,
            thirdPlaceWinnerTeamId: Number(prediction.path?.thirdPlaceWinner) || null,
            winnersByMatch: normalizeNullableNumberRecord(prediction.path?.winnersByMatch),
            knockoutSavedAtByMatchNo: prediction.path?.knockoutSavedAtByMatchNo ?? {},
            knockoutMatchKickoffByMatchNo: knockoutMatchKickoffsByNo,
            predictedAt: submittedAt,
            knockoutOpenAt: deadlines.knockoutOpenAt,
            knockoutLockAt: deadlines.knockoutLockAt,
          },
          actualTournamentResult,
        );
        const championReason = score.reasons.find((reason) => reason.code === "bracket_champion");
        const knockoutReasons = score.reasons.filter((reason) => reason.code !== "bracket_champion");
        const knockoutBasePoints = knockoutReasons.reduce((sum, reason) => sum + reason.points, 0);
        const championBasePoints = championReason?.points ?? 0;

        return [
          {
            user_id: prediction.user_id,
            prediction_type: "bracket_knockout",
            prediction_id: prediction.id,
            match_id: null,
            points: knockoutBasePoints,
            reason_code: knockoutBasePoints > 0 ? "bracket_path_scored" : (score.reasons[0]?.code ?? "bracket_path_no_points"),
            reason: knockoutBasePoints > 0 ? "Tournament path prediction scored" : score.reasons[0]?.description ?? "No tournament path points",
            metadata: {
              basePoints: knockoutBasePoints,
              finalPoints: knockoutBasePoints,
              reasons: knockoutReasons,
              timingBucket: score.timing.bucket,
              timingMultiplier: score.timing.multiplier,
              timingMultiplierBP: score.timing.multiplierBP,
              eligible: score.timing.eligible,
              hoursBeforeDeadline: score.timing.hoursBeforeDeadline,
              pointSystem: "rolling_round_of_32_information_v1",
              submittedAt,
              openAt: deadlines.knockoutOpenAt,
              deadlineAt: deadlines.knockoutLockAt,
            },
            scored_at: calculatedAt,
            calculated_at: calculatedAt,
          } satisfies ScoreRow,
          {
            user_id: prediction.user_id,
            prediction_type: "bracket_champion",
            prediction_id: prediction.id,
            match_id: null,
            points: championBasePoints,
            reason_code: championBasePoints > 0 ? "bracket_champion_scored" : "bracket_champion_no_points",
            reason: championBasePoints > 0 ? "Champion prediction scored" : "No champion prediction points",
            metadata: {
              basePoints: championBasePoints,
              finalPoints: championBasePoints,
              reasons: championReason ? [championReason] : [],
              timingBucket: score.timing.bucket,
              timingMultiplier: score.timing.multiplier,
              timingMultiplierBP: score.timing.multiplierBP,
              eligible: score.timing.eligible,
              pointSystem: "rolling_round_of_32_information_v1",
              submittedAt,
              openAt: deadlines.knockoutOpenAt,
              deadlineAt: deadlines.knockoutLockAt,
            },
            scored_at: calculatedAt,
            calculated_at: calculatedAt,
          } satisfies ScoreRow,
        ];
      })
    : [];

  const scoreRows = [...dailyScoreRows, ...groupScoreRows, ...top8ScoreRows, ...tournamentScoreRows];

  if (scoreRows.length > 0) {
    await insertInChunks("prediction_scores", scoreRows, (chunk) => supabase.from("prediction_scores").insert(chunk));
  }

  const aggregates = new Map<string, LeaderboardAggregate>();
  for (const row of scoreRows) {
    const aggregate = aggregates.get(row.user_id) ?? defaultAggregate();
    applyScoreToAggregate(aggregate, row, today);
    aggregates.set(row.user_id, aggregate);
  }

  const allUserIds = Array.from(new Set([...aggregates.keys(), ...predictionTimestamps.keys()]));
  const { data: profiles } =
    allUserIds.length > 0
      ? await supabase.from("profiles").select("id,email,created_at").in("id", allUserIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile: any) => [String(profile.id), profile]));
  const hiddenCompetitiveUserIds = new Set(
    (profiles ?? []).filter((profile: any) => isCompetitiveHiddenEmail(profile.email)).map((profile: any) => String(profile.id)),
  );
  const { data: systemAdminProfiles } = await supabase.from("profiles").select("id,email").in("email", [...SYSTEM_ADMIN_EMAILS]).limit(10);
  for (const profile of systemAdminProfiles ?? []) {
    if (isCompetitiveHiddenEmail((profile as any).email)) hiddenCompetitiveUserIds.add(String((profile as any).id));
  }

  const existing = await fetchAllPages<any>((from, to) =>
    supabase.from("leaderboard_cache").select("user_id,current_rank").order("user_id", { ascending: true }).range(from, to),
  );
  const previousRankByUserId = new Map(existing.map((row: any) => [String(row.user_id), Number(row.current_rank ?? 0)]));

  const rankedLeaderboardRows = Array.from(aggregates.entries())
    .filter(([userId]) => !hiddenCompetitiveUserIds.has(userId))
    .map(([userId, aggregate]) => ({
      user_id: userId,
      total_points: aggregate.dailyPoints + aggregate.bracketPoints + aggregate.bonusPoints,
      match_points: aggregate.dailyPoints,
      daily_points: aggregate.dailyPoints,
      group_points: 0,
      bracket_points: aggregate.bracketPoints,
      bonus_points: aggregate.bonusPoints,
      today_points: aggregate.todayPoints,
      exact_scores: aggregate.exactScores,
      correct_outcomes: aggregate.correctOutcomes,
      current_rank: 0,
      previous_rank: previousRankByUserId.get(userId) || null,
      rank_change: 0,
      updated_at: calculatedAt,
      scoring_tie_breaker_at: aggregate.scoringTieBreakerAt,
    }))
    .sort((a, b) => {
      const byPoints = b.total_points - a.total_points;
      if (byPoints) return byPoints;
      const byExact = b.exact_scores - a.exact_scores;
      if (byExact) return byExact;
      const byOutcome = b.correct_outcomes - a.correct_outcomes;
      if (byOutcome) return byOutcome;
      const bySubmittedAt = profileCreatedTime(a.scoring_tie_breaker_at) - profileCreatedTime(b.scoring_tie_breaker_at);
      if (bySubmittedAt) return bySubmittedAt;
      return profileCreatedTime(profileById.get(a.user_id)?.created_at) - profileCreatedTime(profileById.get(b.user_id)?.created_at);
    });

  rankedLeaderboardRows.forEach((row, index) => {
    row.current_rank = index + 1;
    row.rank_change = row.previous_rank ? row.previous_rank - row.current_rank : 0;
  });

  const leaderboardRows = rankedLeaderboardRows.map(({ scoring_tie_breaker_at: _scoringTieBreakerAt, ...row }) => row);

  if (hiddenCompetitiveUserIds.size > 0) {
    const { error: hiddenDeleteError } = await supabase.from("leaderboard_cache").delete().in("user_id", Array.from(hiddenCompetitiveUserIds));
    if (hiddenDeleteError) throw new Error(hiddenDeleteError.message);
  }

  if (leaderboardRows.length > 0) {
    const { error: upsertError } = await supabase.from("leaderboard_cache").upsert(leaderboardRows, { onConflict: "user_id" });
    if (upsertError) throw new Error(upsertError.message);
  }

  const leaderboardByUserId = new Map(leaderboardRows.map((row) => [row.user_id, row]));
  const leagueMembers = await fetchAllPages<any>((from, to) =>
    supabase.from("mini_league_members").select("mini_league_id,user_id").order("mini_league_id", { ascending: true }).order("user_id", { ascending: true }).range(from, to),
  );
  const miniLeagueCountByUser = new Map<string, number>();
  for (const member of leagueMembers) {
    const userId = String(member.user_id);
    miniLeagueCountByUser.set(userId, (miniLeagueCountByUser.get(userId) ?? 0) + 1);
  }

  const userStatsRows = allUserIds.map((userId) => {
    const aggregate = aggregates.get(userId) ?? defaultAggregate();
    const leaderboard = leaderboardByUserId.get(userId);
    const predictionTimestamp = predictionTimestamps.get(userId) ?? { count: 0, lastPredictionAt: null };
    return {
      user_id: userId,
      total_points: leaderboard?.total_points ?? 0,
      daily_points: aggregate.dailyPoints,
      bracket_points: aggregate.bracketPoints,
      bonus_points: aggregate.bonusPoints,
      today_points: aggregate.todayPoints,
      exact_scores: aggregate.exactScores,
      correct_outcomes: aggregate.correctOutcomes,
      total_predictions: predictionTimestamp.count,
      current_rank: leaderboard?.current_rank ?? null,
      previous_rank: leaderboard?.previous_rank ?? null,
      rank_change: leaderboard?.rank_change ?? 0,
      mini_league_count: miniLeagueCountByUser.get(userId) ?? 0,
      last_prediction_at: predictionTimestamp.lastPredictionAt,
      last_points_at: aggregate.lastPointsAt,
      updated_at: calculatedAt,
    };
  });

  if (userStatsRows.length > 0) {
    const { error: statsError } = await supabase.from("user_stats_cache").upsert(userStatsRows, { onConflict: "user_id" });
    if (statsError) throw new Error(statsError.message);
  }

  const affectedHighlightDates = Array.from(new Set(dailyScoreRows.map((row) => String(row.metadata.matchdayDate)).filter(Boolean)));
  for (const date of affectedHighlightDates) {
    const { error: deleteHighlightError } = await supabase.from("daily_prediction_highlights_cache").delete().eq("matchday_date", date);
    if (deleteHighlightError) throw new Error(deleteHighlightError.message);
  }

  const highlightRows = affectedHighlightDates.flatMap((date) => {
    return dailyScoreRows
      .filter((row) => row.metadata.matchdayDate === date && row.points > 0 && !hiddenCompetitiveUserIds.has(row.user_id))
      .sort((a, b) => {
        const byPoints = b.points - a.points;
        if (byPoints) return byPoints;
        const byExact = Number(b.metadata.exactScore === true) - Number(a.metadata.exactScore === true);
        if (byExact) return byExact;
        const byMultiplier = Number(b.metadata.timingMultiplier ?? 0) - Number(a.metadata.timingMultiplier ?? 0);
        if (byMultiplier) return byMultiplier;
        return String(a.metadata.submittedAt ?? "").localeCompare(String(b.metadata.submittedAt ?? ""));
      })
      .slice(0, 10)
      .map((row, index) => ({
        matchday_date: date,
        user_id: row.user_id,
        match_id: row.match_id,
        prediction_id: row.prediction_id,
        points: row.points,
        predicted_score_label: String(row.metadata.predictedScoreLabel ?? ""),
        actual_score_label: String(row.metadata.actualScoreLabel ?? ""),
        exact_score: row.metadata.exactScore === true,
        timing_bucket: String(row.metadata.timingBucket ?? "unknown"),
        timing_multiplier: Number(row.metadata.timingMultiplier ?? 1),
        rank: index + 1,
        metadata: row.metadata,
        updated_at: calculatedAt,
      }));
  });

  if (highlightRows.length > 0) {
    const { error: highlightError } = await supabase.from("daily_prediction_highlights_cache").insert(highlightRows);
    if (highlightError) throw new Error(highlightError.message);
  }

  const leagues = await fetchAllPages<any>((from, to) => supabase.from("mini_leagues").select("id,name").order("id", { ascending: true }).range(from, to));
  const existingRankedClubs = await fetchAllPages<any>((from, to) =>
    supabase.from("ranked_mini_leagues_cache").select("mini_league_id,current_rank").order("mini_league_id", { ascending: true }).range(from, to),
  );
  const previousRankByLeagueId = new Map(existingRankedClubs.map((row: any) => [String(row.mini_league_id), Number(row.current_rank ?? 0)]));
  const pointsByUserId = new Map(leaderboardRows.map((row) => [row.user_id, Number(row.total_points)]));
  const rankedClubRows = calculateRankedClubRows({
    leagues: leagues.map((league) => ({ id: String(league.id), name: String(league.name ?? "Club") })),
    members: leagueMembers.map((member) => ({ mini_league_id: String(member.mini_league_id), user_id: String(member.user_id) })),
    pointsByUserId,
    previousRankByLeagueId,
    excludedUserIds: hiddenCompetitiveUserIds,
  });

  const { error: deleteClubsError } = await supabase.from("ranked_mini_leagues_cache").delete().not("mini_league_id", "is", null);
  if (deleteClubsError) throw new Error(deleteClubsError.message);
  if (rankedClubRows.length > 0) {
    await insertInChunks("ranked_mini_leagues_cache", rankedClubRows, (chunk) => supabase.from("ranked_mini_leagues_cache").insert(chunk));
  }

  const streakInputsByUserId = new Map<string, MascotStreakInput[]>();
  for (const prediction of predictionRows) {
    const match = finishedById.get(Number(prediction.match_id));
    if (!match) continue;

    const inputs = streakInputsByUserId.get(prediction.user_id) ?? [];
    inputs.push({
      matchId: Number(match.id),
      kickoffAt: String(match.kickoff_at),
      predictedHomeScore: Number(prediction.home_score),
      predictedAwayScore: Number(prediction.away_score),
      actualHomeScore: Number(match.home_score),
      actualAwayScore: Number(match.away_score),
    });
    streakInputsByUserId.set(prediction.user_id, inputs);
  }

  const mascotUserIds = Array.from(streakInputsByUserId.keys());
  let mascotRowsUpdated = 0;

  if (mascotUserIds.length > 0) {
    const { data: mascotRows, error: mascotRowsError } = await supabase
      .from("user_mascots")
      .select("user_id,starter_mascot,selected_mascot,unlocked_mascots")
      .in("user_id", mascotUserIds);

    if (mascotRowsError) throw new Error(mascotRowsError.message);

    const finalMatchKickoffAt = await getFinalMatchKickoffAt(supabase);
    const finalWeekUnlock = isWorldCupFinalWeek(new Date(), finalMatchKickoffAt);

    const updates = (mascotRows ?? []).flatMap((row: any) => {
      const starterMascot = normalizeMascotId(row.starter_mascot);
      if (!starterMascot) return [];

      const streaks = calculateCorrectOutcomeStreaks(streakInputsByUserId.get(String(row.user_id)) ?? []);
      const aggregate = aggregates.get(String(row.user_id));
      const cosmeticPoints = aggregate ? aggregate.dailyPoints + aggregate.bracketPoints + aggregate.bonusPoints : 0;
      const ruleUnlockedMascots = resolveMascotUnlocks(starterMascot, { cosmeticPoints, finalWeekUnlock });
      const unlockedMascots = mergeMascotIds([...ruleUnlockedMascots, ...normalizeMascotList(row.unlocked_mascots), starterMascot]);
      const selectedMascot = normalizeMascotId(row.selected_mascot);

      return [
        {
          user_id: String(row.user_id),
          starter_mascot: starterMascot,
          selected_mascot: selectedMascot && unlockedMascots.includes(selectedMascot) ? selectedMascot : starterMascot,
          unlocked_mascots: unlockedMascots,
          best_correct_streak: streaks.bestCorrectStreak,
          current_correct_streak: streaks.currentCorrectStreak,
          last_week_unlock: finalWeekUnlock,
          updated_at: calculatedAt,
        },
      ];
    });

    if (updates.length > 0) {
      const { error: mascotUpsertError } = await supabase.from("user_mascots").upsert(updates, { onConflict: "user_id" });
      if (mascotUpsertError) throw new Error(mascotUpsertError.message);
      mascotRowsUpdated = updates.length;
    }
  }

  return {
    ok: true,
    scoredPredictions: predictionRows.length,
    scoredGroupPredictions: groupPredictionRows.length,
    scoredTournamentPredictions: tournamentPredictionRows.length,
    scoreRows: scoreRows.length,
    leaderboardRows: leaderboardRows.length,
    userStatsRows: userStatsRows.length,
    dailyHighlightRows: highlightRows.length,
    rankedClubRows: rankedClubRows.length,
    mascotRowsUpdated,
    message: `Scored ${predictionRows.length} predictions across ${finishedMatches.length} finished fixtures.`,
  };
}
