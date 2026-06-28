import { notFound } from "next/navigation";
import type { PublicAuditTeam, PublicBracketAudit } from "@/components/profile/PublicBracketAuditCard";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getWorldCupDashboardData, type MatchSummary } from "@/lib/data/worldCupData";
import { getWorldCupTeamFlagPath } from "@/lib/data/worldCupTeams";
import { getMascotLockerData } from "@/lib/mascots/server";
import { buildPublicPredictionPreview } from "@/lib/privacy/publicPredictionPreview";
import { buildProfileBracketSummary, parseProfileBracketPath } from "@/lib/profile/bracketSummary";
import { parseDefaultedBracketSegments, type DefaultedBracketSegments } from "@/lib/bracket/defaultPredictionMetadata";
import { deriveWorldCupDeadlines } from "@/lib/scoring/deadlines";
import { resolveTop8PickPoints, TOP8_PERFECT_BONUS_POINTS } from "@/lib/scoring/timing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

type PublicProfilePageProps = {
  params: Promise<{ userId: string }> | { userId: string };
};

type TeamRow = {
  id: number | string;
  name: string | null;
  code: string | null;
  country: string | null;
};

type ScoreRow = {
  prediction_id: string | number | null;
  points: number | null;
  reason: string | null;
  reason_code: string | null;
  metadata: unknown;
  scored_at: string | null;
  calculated_at: string | null;
};

type GroupPredictionRow = {
  id: string | number;
  group_name: string | null;
  winner_team_id: number | string | null;
  runner_up_team_id: number | string | null;
  third_place_team_id: number | string | null;
  ranking_team_ids: unknown;
  meaningful_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StandingRow = {
  group_name: string | null;
  team_id: number | string | null;
  rank: number | string | null;
  points: number | string | null;
  goal_difference: number | string | null;
  goals_for: number | string | null;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { userId } = await params;
  const supabase = createAdminClient();
  const dashboardData = await getWorldCupDashboardData();
  const now = new Date();
  const deadlines = deriveWorldCupDeadlines(dashboardData.matches);
  const bracketRevealAt = deadlines.knockoutLockAt;
  const bracketRevealed = now.getTime() >= new Date(bracketRevealAt).getTime();
  const profileMatches = selectPublicProfileMatches(dashboardData.matches);
  const matchIds = profileMatches.map((match) => match.id);

  const [{ data: profile }, { data: avatar }, { data: stats }, mascotLocker, { data: tournamentPath }, { data: bracketTeams }, { data: standings }, { data: groupPredictions }, { data: matchPredictions }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,department,favorite_country").eq("id", userId).maybeSingle(),
    supabase.from("user_avatars").select("avatar_base,celebration_style,badge_shape,kit_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("leaderboard_cache")
      .select("total_points,match_points,group_points,bracket_points,bonus_points,exact_scores,correct_outcomes,current_rank")
      .eq("user_id", userId)
      .maybeSingle(),
    getMascotLockerData(userId),
    supabase.from("tournament_predictions").select("id,path,top8_submitted_at,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("teams").select("id,name,code,country").limit(500),
    supabase.from("standings").select("group_name,team_id,rank,points,goal_difference,goals_for").not("group_name", "is", null).not("rank", "is", null),
    supabase
      .from("group_predictions")
      .select("id,group_name,winner_team_id,runner_up_team_id,third_place_team_id,ranking_team_ids,meaningful_updated_at,created_at,updated_at")
      .eq("user_id", userId),
    matchIds.length > 0
      ? supabase.from("match_predictions").select("match_id,home_score,away_score,meaningful_updated_at,updated_at").eq("user_id", userId).in("match_id", matchIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (!profile) notFound();

  const displayName = typeof profile.display_name === "string" && profile.display_name ? profile.display_name : "Player";
  const bracketPath = parseProfileBracketPath(tournamentPath?.path);
  const teamRows = (bracketTeams ?? []) as TeamRow[];
  const rawBracketSummary = buildProfileBracketSummary(
    bracketPath,
    teamRows.map((team) => ({
      id: Number(team.id),
      name: String(team.name ?? "Team pending"),
      code: typeof team.code === "string" ? team.code : null,
      country: typeof team.country === "string" ? team.country : null,
    })),
    typeof tournamentPath?.updated_at === "string" ? tournamentPath.updated_at : null,
  );
  const hasSavedBracketPath = Boolean(tournamentPath?.path);
  const bracketSummary = bracketRevealed ? rawBracketSummary : null;
  const bracketAudit = await buildPublicBracketAudit({
    supabase,
    dashboardData,
    bracketRevealAt,
    bracketRevealed,
    top8LockAt: deadlines.top8LockAt,
    tournamentPath,
    path: bracketPath,
    teams: teamRows,
    standings: (standings ?? []) as StandingRow[],
    groupPredictions: (groupPredictions ?? []) as GroupPredictionRow[],
  });

  return (
    <PublicProfileView
      profile={{
        displayName,
        department: typeof profile.department === "string" ? profile.department : null,
        favoriteCountry: typeof profile.favorite_country === "string" ? profile.favorite_country : null,
      }}
      avatar={{
        avatarBase: typeof avatar?.avatar_base === "string" ? avatar.avatar_base : null,
        celebrationStyle: typeof avatar?.celebration_style === "string" ? avatar.celebration_style : null,
        badgeShape: typeof avatar?.badge_shape === "string" ? avatar.badge_shape : null,
        kitId: typeof avatar?.kit_id === "string" ? avatar.kit_id : null,
      }}
      mascot={{
        selectedMascot: mascotLocker.selectedMascot,
        unlockedCount: mascotLocker.unlockedMascots.length,
        currentCorrectStreak: mascotLocker.currentCorrectStreak,
        bestCorrectStreak: mascotLocker.bestCorrectStreak,
      }}
      stats={
        stats
          ? {
              rank: typeof stats.current_rank === "number" ? stats.current_rank : null,
              totalPoints: Number(stats.total_points ?? 0),
              matchPoints: Number(stats.match_points ?? 0),
              groupPoints: Number(stats.group_points ?? 0),
              bracketPoints: Number(stats.bracket_points ?? 0),
              bonusPoints: Number(stats.bonus_points ?? 0),
              exactScores: Number(stats.exact_scores ?? 0),
              correctOutcomes: Number(stats.correct_outcomes ?? 0),
            }
          : null
      }
      bracketSummary={bracketSummary}
      bracketAudit={bracketAudit}
      bracketRevealAt={bracketRevealAt}
      bracketHiddenUntilReveal={!bracketRevealed && hasSavedBracketPath}
      predictionPreview={buildPublicPredictionPreview(profileMatches, matchPredictions ?? [], now)}
      profileUserId={userId}
    />
  );
}

function selectPublicProfileMatches(matches: MatchSummary[]) {
  return matches
    .filter((match) => match.homeTeam && match.awayTeam)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
}

async function buildPublicBracketAudit({
  supabase,
  dashboardData,
  bracketRevealAt,
  bracketRevealed,
  top8LockAt,
  tournamentPath,
  path,
  teams,
  standings,
  groupPredictions,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  dashboardData: Awaited<ReturnType<typeof getWorldCupDashboardData>>;
  bracketRevealAt: string;
  bracketRevealed: boolean;
  top8LockAt: string;
  tournamentPath: any;
  path: ReturnType<typeof parseProfileBracketPath>;
  teams: TeamRow[];
  standings: StandingRow[];
  groupPredictions: GroupPredictionRow[];
}): Promise<PublicBracketAudit> {
  const teamMap = new Map(teams.map((team) => [Number(team.id), toAuditTeam(team)]));
  const groupPredictionIds = groupPredictions.map((prediction) => String(prediction.id));
  const tournamentPredictionId = typeof tournamentPath?.id === "string" ? tournamentPath.id : tournamentPath?.id ? String(tournamentPath.id) : null;

  const [{ data: groupScores }, { data: top8Scores }] = await Promise.all([
    groupPredictionIds.length > 0
      ? supabase.from("prediction_scores").select("prediction_id,points,reason,reason_code,metadata,scored_at,calculated_at").eq("prediction_type", "bracket_group").in("prediction_id", groupPredictionIds)
      : Promise.resolve({ data: [] }),
    tournamentPredictionId
      ? supabase.from("prediction_scores").select("prediction_id,points,reason,reason_code,metadata,scored_at,calculated_at").eq("prediction_type", "bracket_third_place").eq("prediction_id", tournamentPredictionId)
      : Promise.resolve({ data: [] }),
  ]);

  const groupScoreByPredictionId = new Map(((groupScores ?? []) as ScoreRow[]).map((score) => [String(score.prediction_id), score]));
  const top8Score = ((top8Scores ?? []) as ScoreRow[])[0] ?? null;
  const groupByTeamId = teamGroupMap(dashboardData.groups);
  const actualByGroup = actualGroupStandings(standings, teamMap);
  const actualTop8 = top8Score ? actualThirdPlaceQualifierIds(standings) : new Set<number>();
  const defaultedSegments = parseDefaultedBracketSegments(tournamentPath?.path);

  return {
    bracketRevealAt,
    pathHiddenUntilReveal: !bracketRevealed && Boolean(tournamentPath?.path),
    hasSavedPath: Boolean(tournamentPath?.path),
    savedPathAt: typeof tournamentPath?.updated_at === "string" ? tournamentPath.updated_at : null,
    groups: buildGroupAuditRows(groupPredictions, groupScoreByPredictionId, actualByGroup, teamMap, defaultedSegments),
    top8: buildTop8Audit({
      path,
      top8SubmittedAt: typeof tournamentPath?.top8_submitted_at === "string" ? tournamentPath.top8_submitted_at : null,
      top8LockAt,
      top8Score,
      teamMap,
      groupByTeamId,
      actualTop8,
      defaultedSegments,
    }),
  };
}

function buildGroupAuditRows(
  groupPredictions: GroupPredictionRow[],
  groupScoreByPredictionId: Map<string, ScoreRow>,
  actualByGroup: Map<string, PublicAuditTeam[]>,
  teamMap: Map<number, PublicAuditTeam>,
  defaultedSegments: DefaultedBracketSegments | null,
) {
  const predictionByGroup = new Map(groupPredictions.map((prediction) => [groupLetter(prediction.group_name), prediction]));

  return GROUP_LETTERS.map((letter) => {
    const prediction = predictionByGroup.get(letter);
    const score = prediction ? groupScoreByPredictionId.get(String(prediction.id)) ?? null : null;
    const metadata = record(score?.metadata);
    const predictedIds = prediction ? predictionTeamIds(prediction) : [];
    return {
      group: letter,
      savedAt: prediction?.meaningful_updated_at ?? prediction?.updated_at ?? prediction?.created_at ?? null,
      released: Boolean(score),
      points: score ? Number(score.points ?? metadata.finalPoints ?? 0) : null,
      predicted: predictedIds.map((id) => teamMap.get(id)).filter((team): team is PublicAuditTeam => Boolean(team)),
      actual: score ? actualByGroup.get(letter) ?? [] : [],
      reasons: reasons(metadata.reasons),
      source: defaultedSegments?.groups?.[letter] ?? null,
    };
  });
}

function buildTop8Audit({
  path,
  top8SubmittedAt,
  top8LockAt,
  top8Score,
  teamMap,
  groupByTeamId,
  actualTop8,
  defaultedSegments,
}: {
  path: ReturnType<typeof parseProfileBracketPath>;
  top8SubmittedAt: string | null;
  top8LockAt: string;
  top8Score: ScoreRow | null;
  teamMap: Map<number, PublicAuditTeam>;
  groupByTeamId: Map<number, string>;
  actualTop8: Set<number>;
  defaultedSegments: DefaultedBracketSegments | null;
}): PublicBracketAudit["top8"] {
  const metadata = record(top8Score?.metadata);
  const savedByGroup = path?.top8GroupSavedAtByLetter ?? {};
  const storedPickDetails = top8PickDetails(metadata.pickDetails);
  const hasStoredPickDetails = storedPickDetails.length > 0;
  const pickPointsByTeamId = new Map(storedPickDetails.map((detail) => [detail.teamId, detail]));
  const picks = (path?.top8TeamIds ?? [])
    .map((teamId) => {
      const team = teamMap.get(teamId);
      if (!team) return null;
      const group = groupByTeamId.get(teamId) ?? null;
      const detail = pickPointsByTeamId.get(teamId) ?? null;
      const source = group ? defaultedSegments?.top8?.picksByGroup?.[group] ?? null : null;
      const savedAt = detail?.savedAt ?? (group ? savedByGroup[group] ?? source?.savedAt ?? top8SubmittedAt : top8SubmittedAt);
      const correct = top8Score ? detail?.correct ?? actualTop8.has(teamId) : null;
      const fallbackTiming = top8Score && !detail ? resolveTop8PickPoints(savedAt, top8LockAt) : null;
      return {
        team,
        group,
        savedAt,
        correct,
        points: top8Score ? detail?.points ?? (correct && fallbackTiming?.eligible ? fallbackTiming.pointsPerCorrectTeam : 0) : null,
        source,
      };
    })
    .filter((pick): pick is NonNullable<typeof pick> => Boolean(pick));
  const fallbackBasePoints = picks.reduce((sum, pick) => sum + Math.max(0, pick.points ?? 0), 0);
  const fallbackPerfectBonus =
    top8Score && picks.length === 8 && picks.every((pick) => pick.correct === true && Number(pick.points ?? 0) > 0) ? TOP8_PERFECT_BONUS_POINTS : 0;
  const fallbackTotal = fallbackBasePoints + fallbackPerfectBonus;

  return {
    savedAt: top8SubmittedAt,
    scoreReleased: Boolean(top8Score),
    points: top8Score ? (hasStoredPickDetails ? Number(top8Score.points ?? metadata.finalPoints ?? 0) : fallbackTotal) : null,
    picks,
  };
}

function toAuditTeam(team: TeamRow): PublicAuditTeam {
  const normalized = {
    id: Number(team.id),
    name: String(team.name ?? "Team pending"),
    code: typeof team.code === "string" ? team.code : null,
    country: typeof team.country === "string" ? team.country : null,
  };
  return {
    ...normalized,
    flagPath: getWorldCupTeamFlagPath(normalized),
  };
}

function teamGroupMap(groups: Awaited<ReturnType<typeof getWorldCupDashboardData>>["groups"]) {
  const map = new Map<number, string>();
  for (const group of groups) {
    const letter = groupLetter(group.groupName);
    for (const team of group.teams) {
      if (letter) map.set(Number(team.id), letter);
    }
  }
  return map;
}

function actualGroupStandings(standings: StandingRow[], teamMap: Map<number, PublicAuditTeam>) {
  const map = new Map<string, PublicAuditTeam[]>();
  for (const standing of standings) {
    const letter = groupLetter(standing.group_name);
    const rank = numberOrNull(standing.rank);
    const team = teamMap.get(Number(standing.team_id));
    if (!letter || !rank || !team) continue;
    const rows = map.get(letter) ?? [];
    rows[rank - 1] = team;
    map.set(letter, rows);
  }
  return map;
}

function actualThirdPlaceQualifierIds(standings: StandingRow[]) {
  const thirdPlaceRows = standings
    .filter((standing) => typeof standing.group_name === "string" && /^Group [A-L]$/.test(standing.group_name))
    .map((standing) => ({
      teamId: numberOrNull(standing.team_id),
      rank: numberOrNull(standing.rank),
      points: numberOrNull(standing.points),
      goalDifference: numberOrNull(standing.goal_difference),
      goalsFor: numberOrNull(standing.goals_for),
    }))
    .filter(
      (standing): standing is { teamId: number; rank: number; points: number; goalDifference: number; goalsFor: number } =>
        standing.teamId !== null && standing.rank === 3 && standing.points !== null && standing.goalDifference !== null && standing.goalsFor !== null,
    );

  if (thirdPlaceRows.length < 12) return new Set<number>();
  const sorted = [...thirdPlaceRows].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamId - b.teamId);
  const cutoff = sorted[7];
  const next = sorted[8];
  if (!cutoff || !next) return new Set<number>();
  if (cutoff.points === next.points && cutoff.goalDifference === next.goalDifference && cutoff.goalsFor === next.goalsFor) return new Set<number>();
  return new Set(sorted.slice(0, 8).map((standing) => standing.teamId));
}

function groupLetter(value: string | null | undefined) {
  const match = value?.trim().toUpperCase().match(/[A-L]$/);
  return match?.[0] ?? "";
}

function predictionTeamIds(prediction: GroupPredictionRow) {
  const ranking = numberArray(prediction.ranking_team_ids);
  if (ranking.length > 0) return ranking;
  return numberArray([prediction.winner_team_id, prediction.runner_up_team_id, prediction.third_place_team_id]);
}

function numberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0) : [];
}

function record(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)) ? (value as Record<string, unknown>) : {};
}

function reasons(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => {
        const itemRecord = record(item);
        return {
          code: typeof itemRecord.code === "string" ? itemRecord.code : undefined,
          description: typeof itemRecord.description === "string" ? itemRecord.description : undefined,
          points: typeof itemRecord.points === "number" || typeof itemRecord.points === "string" ? itemRecord.points : undefined,
        };
      })
    : [];
}

function top8PickDetails(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const itemRecord = record(item);
          const teamId = numberOrNull(itemRecord.teamId);
          if (teamId === null) return null;
          return {
            teamId,
            correct: itemRecord.correct === true ? true : itemRecord.correct === false ? false : null,
            savedAt: typeof itemRecord.savedAt === "string" ? itemRecord.savedAt : null,
            points: numberOrNull(itemRecord.points) ?? 0,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
