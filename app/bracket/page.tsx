import { BracketPredictor, type OwnBracketAudit, type SavedTournamentPath } from "@/components/bracket/BracketPredictor";
import { DataQualityNotice } from "@/components/groups/DataQualityNotice";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";
import { deriveWorldCupDeadlines } from "@/lib/scoring/deadlines";
import { parseDefaultedBracketSegments } from "@/lib/bracket/defaultPredictionMetadata";
import { assignKnockoutMatchNumbers } from "@/lib/bracket/tournamentPathRules";

export const dynamic = "force-dynamic";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
const FALLBACK_KNOCKOUT_OPEN_AT = "2026-06-28T00:00:00.000Z";
const FALLBACK_KNOCKOUT_LOCK_AT = "2026-07-04T01:30:00.000Z";

type TournamentPredictionRow = {
  id: string | number;
  path: unknown;
  top8_submitted_at: string | null;
  knockout_submitted_at?: string | null;
  updated_at: string | null;
};

type GroupPredictionAuditRow = {
  id: string | number;
  group_name: string | null;
};

type GroupPredictionTimestampRow = {
  group_name: string | null;
  meaningful_updated_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type ScoreAuditRow = {
  prediction_id: string | number | null;
  points: number | null;
  metadata: unknown;
  scored_at: string | null;
  calculated_at: string | null;
};

type StandingAuditRow = {
  group_name: string | null;
  team_id: number | string | null;
  rank: number | string | null;
  points: number | string | null;
  goal_difference: number | string | null;
  goals_for: number | string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function numberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0) : [];
}

function numberRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const numberValue = Number(item);
      return [key, Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null];
    }),
  );
}

function stringRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : null]),
  );
}

function safeIso(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function plusHours(value: string, hours: number) {
  return new Date(new Date(value).getTime() + hours * 36e5).toISOString();
}

function minusHours(value: string, hours: number) {
  return new Date(new Date(value).getTime() - hours * 36e5).toISOString();
}

function openBeforeLock(openAt: string, lockAt: string) {
  const open = new Date(openAt).getTime();
  const lock = new Date(lockAt).getTime();
  if (Number.isFinite(open) && Number.isFinite(lock) && open < lock) return new Date(open).toISOString();
  return minusHours(lockAt, 19);
}

function deriveKnockoutWindow(matches: Array<{ kickoffAt?: string | null; groupName?: string | null; round?: string | null; stage?: string | null }>) {
  const sorted = [...matches]
    .filter((match) => match.kickoffAt)
    .sort((a, b) => new Date(a.kickoffAt ?? "").getTime() - new Date(b.kickoffAt ?? "").getTime());
  const lastGroupKickoff = [...sorted].reverse().find((match) => match.groupName)?.kickoffAt ?? null;
  const roundOf32Kickoffs =
    sorted.filter((match) => {
      const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
      return text.includes("round of 32") || text.includes("round_of_32");
    });
  const lastRoundOf32Kickoff = roundOf32Kickoffs.at(-1)?.kickoffAt ?? null;
  const knockoutLockAt = safeIso(lastRoundOf32Kickoff, FALLBACK_KNOCKOUT_LOCK_AT);
  const knockoutOpenAt = lastGroupKickoff ? plusHours(safeIso(lastGroupKickoff, FALLBACK_KNOCKOUT_OPEN_AT), 3) : FALLBACK_KNOCKOUT_OPEN_AT;
  return {
    knockoutOpenAt: openBeforeLock(safeIso(knockoutOpenAt, FALLBACK_KNOCKOUT_OPEN_AT), knockoutLockAt),
    knockoutLockAt,
  };
}

function parseSavedPath(value: unknown): SavedTournamentPath | null {
  if (!isRecord(value)) return null;

  const groupRankings = isRecord(value.groupRankings)
    ? Object.fromEntries(Object.entries(value.groupRankings).map(([key, ranking]) => [key, numberArray(ranking)]))
    : {};

  return {
    roundOf32: numberArray(value.roundOf32),
    roundOf16: numberArray(value.roundOf16),
    quarterFinalists: numberArray(value.quarterFinalists),
    semiFinalists: numberArray(value.semiFinalists),
    finalists: numberArray(value.finalists),
    champion: Number(value.champion) || null,
    thirdPlaceWinner: Number(value.thirdPlaceWinner) || null,
    groupRankings,
    thirdPlaceGroups: Array.isArray(value.thirdPlaceGroups) ? value.thirdPlaceGroups.map(String) : [],
    top8TeamIds: numberArray(value.top8TeamIds),
    top8GroupSavedAtByLetter: stringRecord(value.top8GroupSavedAtByLetter),
    thirdPlaceSlotTeamIds: numberRecord(value.thirdPlaceSlotTeamIds),
    winnersByMatch: numberRecord(value.winnersByMatch),
    knockoutSavedAtByMatchNo: stringRecord(value.knockoutSavedAtByMatchNo),
  };
}

function knockoutWinnerTeamId(match: {
  status?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { id: number } | null;
  awayTeam?: { id: number } | null;
}) {
  if (match.status !== "finished" || match.homeScore === null || match.awayScore === null) return null;
  if (!match.homeTeam?.id || !match.awayTeam?.id) return null;
  const homeScore = Number(match.homeScore);
  const awayScore = Number(match.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
  if (homeScore > awayScore) return Number(match.homeTeam.id);
  if (awayScore > homeScore) return Number(match.awayTeam.id);
  return null;
}

function knockoutMatchLocksByNo(matches: Array<{ kickoffAt?: string | null; round?: string | null; stage?: string | null }>, nowMs: number) {
  return Object.fromEntries(
    assignKnockoutMatchNumbers(matches)
      .map(({ matchNo, match }) => {
        const kickoffAt = match.kickoffAt ?? null;
        const kickoffMs = kickoffAt ? new Date(kickoffAt).getTime() : Number.NaN;
        return [
          String(matchNo),
          {
            kickoffAt,
            locked: Number.isFinite(kickoffMs) ? nowMs >= kickoffMs : false,
          },
        ] as const;
      }),
  );
}

function actualKnockoutWinnersByNo(matches: Array<{ kickoffAt?: string | null; round?: string | null; stage?: string | null; status?: string | null; homeScore?: number | null; awayScore?: number | null; homeTeam?: { id: number } | null; awayTeam?: { id: number } | null }>) {
  return Object.fromEntries(
    assignKnockoutMatchNumbers(matches)
      .map(({ matchNo, match }) => [String(matchNo), knockoutWinnerTeamId(match)] as const)
      .filter(([, winnerTeamId]) => Number.isFinite(Number(winnerTeamId)) && Number(winnerTeamId) > 0),
  );
}

function groupLetter(groupName: string | null | undefined) {
  const match = groupName?.trim().toUpperCase().match(/[A-L]$/);
  return match?.[0] ?? null;
}

function groupSavedAtByLetter(rows: GroupPredictionTimestampRow[] | null | undefined) {
  return Object.fromEntries(
    (rows ?? [])
      .map((row) => {
        const letter = groupLetter(row.group_name);
        const savedAt = row.meaningful_updated_at ?? row.updated_at ?? row.created_at ?? null;
        return letter ? [letter, savedAt] : null;
      })
      .filter((entry): entry is [string, string | null] => Boolean(entry)),
  );
}

async function getSavedTournamentPath(userId?: string | null) {
  if (!userId) return { path: null, updatedAt: null, top8SubmittedAt: null, groupSavedAtByLetter: {} };

  const supabase = createAdminClient();
  const [{ data }, { data: groupRows }] = await Promise.all([
    supabase
      .from("tournament_predictions")
      .select("id,path,top8_submitted_at,updated_at")
      .eq("user_id", userId)
      .maybeSingle<TournamentPredictionRow>(),
    supabase
      .from("group_predictions")
      .select("group_name,meaningful_updated_at,updated_at,created_at")
      .eq("user_id", userId),
  ]);

  return {
    path: parseSavedPath(data?.path),
    updatedAt: data?.updated_at ?? null,
    top8SubmittedAt: data?.top8_submitted_at ?? null,
    groupSavedAtByLetter: groupSavedAtByLetter(groupRows as GroupPredictionTimestampRow[] | null),
  };
}

async function getOwnBracketAudit(userId?: string | null): Promise<OwnBracketAudit | null> {
  if (!userId) return null;

  const supabase = createAdminClient();
  const [{ data: groupRows }, { data: tournamentRow }, { data: standings }] = await Promise.all([
    supabase.from("group_predictions").select("id,group_name").eq("user_id", userId),
    supabase.from("tournament_predictions").select("id,path").eq("user_id", userId).maybeSingle<Pick<TournamentPredictionRow, "id" | "path">>(),
    supabase
      .from("standings")
      .select("group_name,team_id,rank,points,goal_difference,goals_for")
      .not("group_name", "is", null)
      .not("rank", "is", null),
  ]);

  const groupPredictionRows = (groupRows ?? []) as GroupPredictionAuditRow[];
  const groupPredictionIds = groupPredictionRows.map((row) => String(row.id));
  const tournamentPredictionId = tournamentRow?.id ? String(tournamentRow.id) : null;
  const defaultedSegments = parseDefaultedBracketSegments(tournamentRow?.path);
  const [{ data: groupScores }, { data: top8Scores }] = await Promise.all([
    groupPredictionIds.length > 0
      ? supabase
          .from("prediction_scores")
          .select("prediction_id,points,metadata,scored_at,calculated_at")
          .eq("user_id", userId)
          .eq("prediction_type", "bracket_group")
          .in("prediction_id", groupPredictionIds)
      : Promise.resolve({ data: [] }),
    tournamentPredictionId
      ? supabase
          .from("prediction_scores")
          .select("prediction_id,points,metadata,scored_at,calculated_at")
          .eq("user_id", userId)
          .eq("prediction_type", "bracket_third_place")
          .eq("prediction_id", tournamentPredictionId)
      : Promise.resolve({ data: [] }),
  ]);

  const groupByLetter = new Map(groupPredictionRows.map((row) => [groupLetter(row.group_name), row]));
  const scoreByPredictionId = new Map(((groupScores ?? []) as ScoreAuditRow[]).map((score) => [String(score.prediction_id), score]));
  const actualGroups = actualGroupTeamIds((standings ?? []) as StandingAuditRow[]);
  const groups = Object.fromEntries(
    GROUP_LETTERS.map((letter) => {
      const prediction = groupByLetter.get(letter);
      const score = prediction ? scoreByPredictionId.get(String(prediction.id)) ?? null : null;
      const metadata = record(score?.metadata);
      const pointValues = record(metadata.pointValues);
      return [
        letter,
        {
          released: Boolean(score),
          points: score ? Number(score.points ?? metadata.finalPoints ?? 0) : null,
          actualTeamIds: score ? actualGroups.get(letter) ?? [] : [],
          pointValues: {
            first: numberOrUndefined(pointValues.first),
            second: numberOrUndefined(pointValues.second),
            third: numberOrUndefined(pointValues.third),
          },
          reasons: reasons(metadata.reasons),
          scoredAt: typeof score?.scored_at === "string" ? score.scored_at : typeof score?.calculated_at === "string" ? score.calculated_at : null,
          source: defaultedSegments?.groups?.[letter] ?? null,
        },
      ];
    }),
  );

  const top8Score = ((top8Scores ?? []) as ScoreAuditRow[])[0] ?? null;
  const top8Metadata = record(top8Score?.metadata);
  const top8ActualTeamIds = top8Score ? Array.from(actualThirdPlaceQualifierIds((standings ?? []) as StandingAuditRow[])) : [];

  return {
    groups,
    top8: {
      released: Boolean(top8Score),
      points: top8Score ? Number(top8Score.points ?? top8Metadata.finalPoints ?? 0) : null,
      basePoints: top8Score ? numberOrNull(top8Metadata.basePoints) : null,
      timingMultiplier: top8Score ? numberOrNull(top8Metadata.timingMultiplier) : null,
      correctTeams: top8Score ? numberOrNull(top8Metadata.correctTeams) : null,
      perfectBonus: top8Score ? numberOrNull(top8Metadata.perfectBonus) : null,
      pickDetails: top8Score ? top8PickDetails(top8Metadata.pickDetails) : [],
      actualTeamIds: top8ActualTeamIds,
      reasons: reasons(top8Metadata.reasons),
      scoredAt: typeof top8Score?.scored_at === "string" ? top8Score.scored_at : typeof top8Score?.calculated_at === "string" ? top8Score.calculated_at : null,
      sourcesByGroup: defaultedSegments?.top8?.picksByGroup ?? {},
    },
  };
}

export default async function BracketPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [worldCupData, saved, audit] = await Promise.all([getWorldCupDashboardData(), getSavedTournamentPath(auth.user?.id), getOwnBracketAudit(auth.user?.id)]);
  const firstKickoffAt = worldCupData.matches[0]?.kickoffAt ?? null;
  const deadlines = deriveWorldCupDeadlines(worldCupData.matches);
  const bracketDeadlines = { ...deadlines, ...deriveKnockoutWindow(worldCupData.matches) };
  const now = Date.now();
  const groupPointValues = Object.fromEntries(
    worldCupData.groups.map((group) => {
      const kickoffs = worldCupData.matches
        .filter((match) => match.groupName === group.groupName)
        .map((match) => match.kickoffAt)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const dropAt = kickoffs.slice(0, 2);
      const started = dropAt.filter((kickoff) => now >= new Date(kickoff).getTime()).length;
      const values = started >= 2 ? { first: 3, second: 2, third: 1 } : started === 1 ? { first: 4, second: 3, third: 2 } : { first: 6, second: 4, third: 3 };
      return [group.groupName.replace(/^Group\s+/i, ""), { ...values, dropAt }];
    }),
  );
  const fullGroups = worldCupData.groups.filter((group) => group.teams.length === 4);

  if (worldCupData.groups.length === 0) {
    return (
      <DataQualityNotice
        title="Bracket data pending sync"
        message="No official synced groups were found. Run Admin Sync or review data quality before opening full tournament path predictions."
      />
    );
  }

  if (fullGroups.length !== 12) {
    return (
      <DataQualityNotice
        title="Official group draw is not ready"
        message={`${fullGroups.length}/12 groups have four synced teams. The bracket predictor stays closed until every group is complete so production picks never rely on placeholder countries.`}
      />
    );
  }

  return (
    <BracketPredictor
      groups={worldCupData.groups}
      signedIn={Boolean(auth.user)}
      firstKickoffAt={firstKickoffAt}
      deadlines={bracketDeadlines}
      groupPointValues={groupPointValues}
      initialPath={saved.path}
      savedAt={saved.updatedAt}
      top8SavedAt={saved.top8SubmittedAt}
      initialGroupSavedAtByLetter={saved.groupSavedAtByLetter}
      audit={audit}
      knockoutMatchLocksByNo={knockoutMatchLocksByNo(worldCupData.matches, now)}
      actualKnockoutWinnersByNo={actualKnockoutWinnersByNo(worldCupData.matches)}
    />
  );
}

function actualGroupTeamIds(standings: StandingAuditRow[]) {
  const map = new Map<string, number[]>();
  for (const standing of standings) {
    const letter = groupLetter(standing.group_name);
    const rank = numberOrNull(standing.rank);
    const teamId = numberOrNull(standing.team_id);
    if (!letter || !rank || !teamId) continue;
    const rows = map.get(letter) ?? [];
    rows[rank - 1] = teamId;
    map.set(letter, rows);
  }
  return map;
}

function actualThirdPlaceQualifierIds(standings: StandingAuditRow[]) {
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
            pointsPerCorrectTeam: numberOrNull(itemRecord.pointsPerCorrectTeam) ?? 0,
            timingBucket: typeof itemRecord.timingBucket === "string" ? itemRecord.timingBucket : null,
            eligible: itemRecord.eligible === true ? true : itemRecord.eligible === false ? false : null,
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

function numberOrUndefined(value: unknown) {
  const number = numberOrNull(value);
  return number === null ? undefined : number;
}
