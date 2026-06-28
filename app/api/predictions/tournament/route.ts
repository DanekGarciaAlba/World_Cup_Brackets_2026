import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { canonicalWorldCupGroupName } from "@/lib/data/officialGroups";
import { resolveThirdPlaceSlotGroups } from "@/lib/data/worldCupThirdPlaceRules";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveWorldCupDeadlines, isStrictlyBefore } from "@/lib/scoring/deadlines";

const GROUP_LETTERS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

const pathSchema = z.object({
  roundOf32: z.array(z.coerce.number().int().positive()).max(32).default([]),
  roundOf16: z.array(z.coerce.number().int().positive()).max(16).default([]),
  quarterFinalists: z.array(z.coerce.number().int().positive()).max(8).default([]),
  semiFinalists: z.array(z.coerce.number().int().positive()).max(4).default([]),
  finalists: z.array(z.coerce.number().int().positive()).max(2).default([]),
  champion: z.coerce.number().int().positive().nullable().default(null),
  thirdPlaceWinner: z.coerce.number().int().positive().nullable().default(null),
  groupRankings: z.record(z.string(), z.array(z.coerce.number().int().positive()).max(4)).optional().default({}),
  groupScope: z.array(z.string()).max(12).optional().default([]),
  thirdPlaceGroups: z.array(z.string()).max(12).optional().default([]),
  top8TeamIds: z.array(z.coerce.number().int().positive()).max(48).optional().default([]),
  top8GroupSavedAtByLetter: z.record(z.string(), z.union([z.string(), z.null()])).optional().default({}),
  thirdPlaceSlotTeamIds: z.record(z.string(), z.union([z.coerce.number().int().positive(), z.null()])).optional().default({}),
  winnersByMatch: z.record(z.string(), z.union([z.coerce.number().int().positive(), z.null()])).optional().default({}),
  knockoutSavedAtByMatchNo: z.record(z.string(), z.union([z.string(), z.null()])).optional().default({}),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clear-top8") }),
  z.object({
    action: z.literal("save-top8-group"),
    group: z.string(),
    teamId: z.coerce.number().int().positive(),
  }),
  z.object({
    action: z.literal("clear-top8-group"),
    group: z.string(),
  }),
]);

function hasDuplicate(values: number[]) {
  return new Set(values).size !== values.length;
}

function includesAll(container: number[], values: number[]) {
  const set = new Set(container);
  return values.every((value) => set.has(value));
}

function sameNumberArray(a: number[] = [], b: number[] = []) {
  return a.length === b.length && a.every((value, index) => Number(value) === Number(b[index]));
}

function sameSortedNumberArray(a: number[] = [], b: number[] = []) {
  const left = [...a].map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  const right = [...b].map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeGroupName(group: string) {
  return group.length === 1 ? `Group ${group}` : group;
}

function groupLetter(groupName: string) {
  const match = groupName.trim().toUpperCase().match(/[A-L]$/);
  return match?.[0] ?? groupName.trim().toUpperCase();
}

function groupSavedAtByLetter(rows: Array<{ group_name?: string | null; meaningful_updated_at?: string | null; updated_at?: string | null; created_at?: string | null }>) {
  return Object.fromEntries(
    rows
      .map((row) => {
        const name = typeof row.group_name === "string" ? row.group_name : "";
        const savedAt = row.meaningful_updated_at ?? row.updated_at ?? row.created_at ?? null;
        return name ? [groupLetter(name), savedAt] : null;
      })
      .filter((entry): entry is [string, string | null] => Boolean(entry)),
  );
}

function groupPredictionRows(
  userId: string,
  groupRankings: Record<string, number[]>,
  existingByGroup: Map<string, { ranking_team_ids?: number[] | null; meaningful_updated_at?: string | null; updated_at?: string | null; created_at?: string | null }>,
  now: string,
) {
  return Object.entries(groupRankings)
    .filter(([, rankings]) => rankings.length >= 3)
    .map(([group, rankings]) => {
      const groupName = normalizeGroupName(group);
      const existing = existingByGroup.get(groupName);
      const existingRanking = Array.isArray(existing?.ranking_team_ids) ? existing.ranking_team_ids.map(Number) : [];
      const changed = !sameNumberArray(existingRanking, rankings);
      return {
        user_id: userId,
        group_name: groupName,
        winner_team_id: rankings[0],
        runner_up_team_id: rankings[1],
        third_place_team_id: rankings[2],
        ranking_team_ids: rankings,
        meaningful_updated_at: changed ? now : (existing?.meaningful_updated_at ?? existing?.updated_at ?? existing?.created_at ?? now),
        updated_at: now,
      };
    });
}

function bracketPredictionRows(userId: string, winnersByMatch: Record<string, number | null>, now: string) {
  return Object.entries(winnersByMatch)
    .map(([matchNo, winnerTeamId]) => ({
      user_id: userId,
      match_no: Number(matchNo),
      round: roundForMatchNo(Number(matchNo)),
      predicted_winner_team_id: winnerTeamId,
      updated_at: now,
    }))
    .filter((row) => Number.isInteger(row.match_no) && row.match_no >= 73 && row.match_no <= 104 && row.predicted_winner_team_id);
}

function roundForMatchNo(matchNo: number) {
  if (matchNo >= 73 && matchNo <= 88) return "Round of 32";
  if (matchNo >= 89 && matchNo <= 96) return "Round of 16";
  if (matchNo >= 97 && matchNo <= 100) return "Quarter-final";
  if (matchNo >= 101 && matchNo <= 102) return "Semi-final";
  if (matchNo === 103) return "Third place";
  if (matchNo === 104) return "Final";
  return "Projected";
}

async function getTournamentDeadlines() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("kickoff_at,round,stage,group_name,home_team_id,away_team_id")
    .order("kickoff_at", { ascending: true })
    .limit(220);
  if (error) throw new Error(error.message);
  return deriveWorldCupDeadlines((data ?? []) as any[]);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeTop8SavedAtMap(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, savedAt]) => {
        const letter = groupLetter(key);
        return /^[A-L]$/.test(letter) ? [letter, typeof savedAt === "string" ? savedAt : null] : null;
      })
      .filter((entry): entry is [string, string | null] => Boolean(entry)),
  );
}

function normalizeKnockoutSavedAtMap(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, savedAt]) => {
        const matchNo = Number(key);
        return Number.isInteger(matchNo) && matchNo >= 73 && matchNo <= 104 ? [String(matchNo), typeof savedAt === "string" ? savedAt : null] : null;
      })
      .filter((entry): entry is [string, string | null] => Boolean(entry)),
  );
}

function normalizeWinnerRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, winner]) => {
        const matchNo = Number(key);
        const winnerId = Number(winner);
        return Number.isInteger(matchNo) && matchNo >= 73 && matchNo <= 104 && Number.isFinite(winnerId) && winnerId > 0
          ? [String(matchNo), winnerId]
          : null;
      })
      .filter((entry): entry is [string, number] => Boolean(entry)),
  );
}

function isUsableTimestamp(value: string | null | undefined, openAt: string) {
  if (!value) return false;
  return !isStrictlyBefore(value, openAt);
}

function knockoutSavedAtMapForWinners(
  nextWinners: Record<string, number | null>,
  existingWinners: Record<string, unknown>,
  existingSavedAtMap: Record<string, string | null>,
  existingSubmittedAt: string | null,
  now: string,
  openAt: string,
) {
  const normalizedExistingWinners = normalizeWinnerRecord(existingWinners);
  const nextSavedAtMap: Record<string, string | null> = {};

  for (const [matchNo, winnerTeamId] of Object.entries(nextWinners)) {
    const winner = Number(winnerTeamId);
    if (!Number.isFinite(winner) || winner <= 0) continue;
    const existingWinner = normalizedExistingWinners[matchNo];
    const existingSavedAt = existingSavedAtMap[matchNo] ?? null;

    if (existingWinner === winner && isUsableTimestamp(existingSavedAt, openAt)) {
      nextSavedAtMap[matchNo] = existingSavedAt;
      continue;
    }

    if (existingWinner === winner && isUsableTimestamp(existingSubmittedAt, openAt)) {
      nextSavedAtMap[matchNo] = existingSubmittedAt;
      continue;
    }

    nextSavedAtMap[matchNo] = now;
  }

  return nextSavedAtMap;
}

function existingPathSegment(path: unknown) {
  const record = isRecord(path) ? path : {};
  return {
    groupRankings: isRecord(record.groupRankings)
      ? Object.fromEntries(Object.entries(record.groupRankings).map(([key, value]) => [key, Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : []]))
      : {},
    thirdPlaceGroups: Array.isArray(record.thirdPlaceGroups) ? record.thirdPlaceGroups.map(String) : [],
    top8TeamIds: Array.isArray(record.top8TeamIds) ? record.top8TeamIds.map(Number).filter((teamId) => Number.isFinite(teamId) && teamId > 0) : [],
    top8GroupSavedAtByLetter: normalizeTop8SavedAtMap(record.top8GroupSavedAtByLetter),
    thirdPlaceSlotTeamIds: isRecord(record.thirdPlaceSlotTeamIds) ? record.thirdPlaceSlotTeamIds : {},
    winnersByMatch: isRecord(record.winnersByMatch) ? record.winnersByMatch : {},
    knockoutSavedAtByMatchNo: normalizeKnockoutSavedAtMap(record.knockoutSavedAtByMatchNo),
    roundOf32: Array.isArray(record.roundOf32) ? record.roundOf32.map(Number).filter(Number.isFinite) : [],
    roundOf16: Array.isArray(record.roundOf16) ? record.roundOf16.map(Number).filter(Number.isFinite) : [],
    quarterFinalists: Array.isArray(record.quarterFinalists) ? record.quarterFinalists.map(Number).filter(Number.isFinite) : [],
    semiFinalists: Array.isArray(record.semiFinalists) ? record.semiFinalists.map(Number).filter(Number.isFinite) : [],
    finalists: Array.isArray(record.finalists) ? record.finalists.map(Number).filter(Number.isFinite) : [],
    champion: Number(record.champion) || null,
    thirdPlaceWinner: Number(record.thirdPlaceWinner) || null,
  };
}

type ExistingPathSegment = ReturnType<typeof existingPathSegment>;

function scopedGroupRankings(
  groupRankings: Record<string, number[]>,
  scope: Set<string>,
) {
  if (scope.size === 0) return groupRankings;

  return Object.fromEntries(
    Array.from(scope)
      .map((letter) => {
        const ranking = groupRankings[letter] ?? groupRankings[`Group ${letter}`] ?? [];
        return [letter, ranking] as const;
      })
      .filter(([, ranking]) => ranking.length > 0),
  );
}

function validateTop8TeamSelection(
  teamIds: number[],
  teamGroupById: Map<number, string>,
) {
  const uniqueTeamIds = Array.from(new Set(teamIds.map(Number).filter((teamId) => Number.isFinite(teamId) && teamId > 0)));
  if (uniqueTeamIds.length !== 8 || uniqueTeamIds.length !== teamIds.length) {
    return { error: "Top 8 must contain exactly eight unique teams." } as const;
  }

  const selectedGroups = uniqueTeamIds.map((teamId) => teamGroupById.get(teamId) ?? null);
  if (selectedGroups.some((group) => !group || !/^[A-L]$/.test(group))) {
    return { error: "Every Top 8 team must belong to an official Group A-L." } as const;
  }

  const groups = selectedGroups.filter((group): group is string => Boolean(group));
  if (new Set(groups).size !== groups.length) {
    return { error: "Top 8 can only include one third-place candidate from each group." } as const;
  }

  const thirdPlaceGroups = [...groups].sort();
  const teamIdByGroup = new Map(groups.map((group, index) => [group, uniqueTeamIds[index]] as const));
  const thirdPlaceSlotGroups = resolveThirdPlaceSlotGroups(thirdPlaceGroups);
  const thirdPlaceSlotTeamIds = Object.fromEntries(
    Object.entries(thirdPlaceSlotGroups).map(([matchNo, group]) => [matchNo, teamIdByGroup.get(group) ?? null]),
  );

  return {
    top8TeamIds: uniqueTeamIds,
    thirdPlaceGroups,
    thirdPlaceSlotTeamIds,
  } as const;
}

function validatePartialTop8TeamSelection(
  teamIds: number[],
  teamGroupById: Map<number, string>,
) {
  const uniqueTeamIds = Array.from(new Set(teamIds.map(Number).filter((teamId) => Number.isFinite(teamId) && teamId > 0)));
  if (uniqueTeamIds.length !== teamIds.length) {
    return { error: "Top 8 cannot contain duplicate teams." } as const;
  }
  if (uniqueTeamIds.length > 8) {
    return { error: "Top 8 can only contain eight teams." } as const;
  }

  const selectedGroups = uniqueTeamIds.map((teamId) => teamGroupById.get(teamId) ?? null);
  if (selectedGroups.some((group) => !group || !/^[A-L]$/.test(group))) {
    return { error: "Every Top 8 team must belong to an official Group A-L." } as const;
  }

  const groups = selectedGroups.filter((group): group is string => Boolean(group));
  if (new Set(groups).size !== groups.length) {
    return { error: "Top 8 can only include one third-place candidate from each group." } as const;
  }

  const thirdPlaceGroups = [...groups].sort();
  const teamIdByGroup = new Map(groups.map((group, index) => [group, uniqueTeamIds[index]] as const));
  const thirdPlaceSlotGroups = thirdPlaceGroups.length === 8 ? resolveThirdPlaceSlotGroups(thirdPlaceGroups) : {};
  const thirdPlaceSlotTeamIds = Object.fromEntries(
    Object.entries(thirdPlaceSlotGroups).map(([matchNo, group]) => [matchNo, teamIdByGroup.get(group) ?? null]),
  );

  return {
    top8TeamIds: uniqueTeamIds,
    thirdPlaceGroups,
    thirdPlaceSlotTeamIds,
  } as const;
}

function top8TeamIdByGroup(teamIds: number[], teamGroupById: Map<number, string>) {
  const selected = new Map<string, number>();
  for (const teamId of teamIds) {
    const group = teamGroupById.get(Number(teamId));
    if (group && /^[A-L]$/.test(group) && !selected.has(group)) selected.set(group, Number(teamId));
  }
  return selected;
}

function top8SavedAtMapForTeamIds(
  teamIds: number[],
  teamGroupById: Map<number, string>,
  existingMap: Record<string, string | null>,
  fallbackSavedAt: string | null,
) {
  const savedAtByGroup: Record<string, string | null> = {};
  for (const teamId of teamIds) {
    const group = teamGroupById.get(Number(teamId));
    if (!group || !/^[A-L]$/.test(group)) continue;
    savedAtByGroup[group] = existingMap[group] ?? fallbackSavedAt ?? null;
  }
  return savedAtByGroup;
}

function latestSavedAt(values: Record<string, string | null>) {
  return Object.values(values)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function top8CompleteWithSavedTimestamps(teamIds: number[], savedAtByGroup: Record<string, string | null>, teamGroupById: Map<number, string>) {
  return teamIds.length === 8 && teamIds.every((teamId) => {
    const group = teamGroupById.get(Number(teamId));
    return Boolean(group && savedAtByGroup[group]);
  });
}

function clearKnockout(path: ExistingPathSegment): ExistingPathSegment {
  return {
    ...path,
    roundOf32: [],
    roundOf16: [],
    quarterFinalists: [],
    semiFinalists: [],
    finalists: [],
    champion: null,
    thirdPlaceWinner: null,
    winnersByMatch: {},
    knockoutSavedAtByMatchNo: {},
  };
}

function clearTop8AndKnockout(path: ExistingPathSegment): ExistingPathSegment {
  return {
    ...clearKnockout(path),
    top8TeamIds: [],
    top8GroupSavedAtByLetter: {},
    thirdPlaceGroups: [],
    thirdPlaceSlotTeamIds: {},
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = pathSchema.parse(await request.json());
    const deadlines = await getTournamentDeadlines();
    const now = new Date().toISOString();
    const groupOpen = isStrictlyBefore(now, deadlines.groupCutoffAt);
    const top8Started = !isStrictlyBefore(now, deadlines.top8OpenAt);
    const top8Open = top8Started && isStrictlyBefore(now, deadlines.top8LockAt);
    const knockoutStarted = !isStrictlyBefore(now, deadlines.knockoutOpenAt);
    const knockoutOpen = knockoutStarted && isStrictlyBefore(now, deadlines.knockoutLockAt);
    const supabase = createAdminClient();
    const groupScope = new Set(
      payload.groupScope
        .map((group) => groupLetter(String(group)))
        .filter((group) => /^[A-L]$/.test(group)),
    );
    const nextGroupRankings = scopedGroupRankings(payload.groupRankings, groupScope);

    const [{ data: existingTournament }, { data: existingGroups }, { data: teamRows }] = await Promise.all([
      supabase
        .from("tournament_predictions")
        .select("path,top8_submitted_at,knockout_submitted_at,created_at,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("group_predictions")
        .select("group_name,ranking_team_ids,meaningful_updated_at,updated_at,created_at")
        .eq("user_id", user.id),
      supabase.from("teams").select("id,group_name").limit(500),
    ]);
    const existingPath = existingPathSegment((existingTournament as any)?.path);
    const teamGroupById = new Map(
      ((teamRows ?? []) as any[])
        .map((row) => {
          const teamId = Number(row.id);
          const groupName = canonicalWorldCupGroupName(row.group_name);
          const letter = groupName ? groupLetter(groupName) : null;
          return Number.isFinite(teamId) && letter ? [teamId, letter] : null;
        })
        .filter((entry): entry is [number, string] => Boolean(entry)),
    );
    const existingGroupsByName = new Map(
      ((existingGroups ?? []) as any[]).map((row) => [
        String(row.group_name),
        {
          ranking_team_ids: Array.isArray(row.ranking_team_ids) ? row.ranking_team_ids.map(Number) : [],
          meaningful_updated_at: typeof row.meaningful_updated_at === "string" ? row.meaningful_updated_at : null,
          updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
          created_at: typeof row.created_at === "string" ? row.created_at : null,
        },
      ]),
    );

    const rounds = [payload.roundOf32, payload.roundOf16, payload.quarterFinalists, payload.semiFinalists, payload.finalists];
    if (rounds.some(hasDuplicate)) {
      return NextResponse.json({ error: "A team can only appear once in the same round." }, { status: 400 });
    }

    if (payload.champion && !payload.finalists.includes(payload.champion)) {
      return NextResponse.json({ error: "Champion must also be one of your finalists." }, { status: 400 });
    }

    const thirdPlaceWinner = payload.thirdPlaceWinner ?? payload.winnersByMatch["103"] ?? null;
    const thirdPlacePool = payload.semiFinalists.filter((teamId) => !payload.finalists.includes(teamId));
    if (thirdPlaceWinner && !thirdPlacePool.includes(thirdPlaceWinner)) {
      return NextResponse.json({ error: "Third-place winner must be one of your semi-final non-finalists." }, { status: 400 });
    }
    payload.thirdPlaceWinner = thirdPlaceWinner;

    if (
      !includesAll(payload.semiFinalists, payload.finalists) ||
      !includesAll(payload.quarterFinalists, payload.semiFinalists) ||
      !includesAll(payload.roundOf16, payload.quarterFinalists) ||
      !includesAll(payload.roundOf32, payload.roundOf16)
    ) {
      return NextResponse.json({ error: "Later-round teams must also exist in each earlier round." }, { status: 400 });
    }

    const hasExistingGroups = Object.keys(existingPath.groupRankings).length > 0 || existingGroupsByName.size > 0;
    const hasExistingTop8 = existingPath.top8TeamIds.length === 8;
    const hasExistingKnockout = Object.keys(existingPath.winnersByMatch).length > 0;
    const isTop8SaveAttempt = groupScope.size === 0 && payload.top8TeamIds.length > 0;

    if (!groupOpen && Object.keys(payload.groupRankings).length > 0 && !hasExistingGroups && !isTop8SaveAttempt) {
      return NextResponse.json({ error: "Group ranking window is closed and no previous valid group picks exist." }, { status: 409 });
    }

    if (!top8Open && payload.top8TeamIds.length > 0 && top8Started && !hasExistingTop8) {
      return NextResponse.json({ error: "Top 8 window is closed and no previous valid Top 8 pick exists." }, { status: 409 });
    }

    if (!knockoutOpen && Object.keys(payload.winnersByMatch).length > 0 && !hasExistingKnockout && knockoutStarted) {
      return NextResponse.json({ error: "Knockout bracket window is closed and no previous valid knockout bracket exists." }, { status: 409 });
    }

    const shouldApplyTop8FromPost = top8Open && groupScope.size === 0 && payload.top8TeamIds.length > 0;
    const nextTop8 = shouldApplyTop8FromPost ? validateTop8TeamSelection(payload.top8TeamIds, teamGroupById) : null;
    if (nextTop8 && "error" in nextTop8) {
      return NextResponse.json({ error: nextTop8.error }, { status: 400 });
    }

    const existingTop8SubmittedAt = (existingTournament as any)?.top8_submitted_at ?? null;
    const existingKnockoutSubmittedAt = (existingTournament as any)?.knockout_submitted_at ?? null;
    const existingTop8SavedAtMap = top8SavedAtMapForTeamIds(
      existingPath.top8TeamIds,
      teamGroupById,
      existingPath.top8GroupSavedAtByLetter,
      existingTop8SubmittedAt,
    );
    const nextKnockoutSavedAtMap = knockoutOpen
      ? knockoutSavedAtMapForWinners(
          payload.winnersByMatch,
          existingPath.winnersByMatch,
          existingPath.knockoutSavedAtByMatchNo,
          existingKnockoutSubmittedAt,
          now,
          deadlines.knockoutOpenAt,
        )
      : existingPath.knockoutSavedAtByMatchNo;

    const finalPathBase = {
      roundOf32: knockoutOpen ? payload.roundOf32 : existingPath.roundOf32,
      roundOf16: knockoutOpen ? payload.roundOf16 : existingPath.roundOf16,
      quarterFinalists: knockoutOpen ? payload.quarterFinalists : existingPath.quarterFinalists,
      semiFinalists: knockoutOpen ? payload.semiFinalists : existingPath.semiFinalists,
      finalists: knockoutOpen ? payload.finalists : existingPath.finalists,
      champion: knockoutOpen ? payload.champion : existingPath.champion,
      thirdPlaceWinner: knockoutOpen ? payload.thirdPlaceWinner : existingPath.thirdPlaceWinner,
      groupRankings: groupOpen
        ? groupScope.size > 0
          ? { ...existingPath.groupRankings, ...nextGroupRankings }
          : payload.groupRankings
        : existingPath.groupRankings,
      top8TeamIds: shouldApplyTop8FromPost && nextTop8 && !("error" in nextTop8) ? nextTop8.top8TeamIds : existingPath.top8TeamIds,
      top8GroupSavedAtByLetter: existingTop8SavedAtMap,
      thirdPlaceGroups: shouldApplyTop8FromPost && nextTop8 && !("error" in nextTop8) ? nextTop8.thirdPlaceGroups : existingPath.thirdPlaceGroups,
      thirdPlaceSlotTeamIds: shouldApplyTop8FromPost && nextTop8 && !("error" in nextTop8) ? nextTop8.thirdPlaceSlotTeamIds : existingPath.thirdPlaceSlotTeamIds,
      winnersByMatch: knockoutOpen ? payload.winnersByMatch : existingPath.winnersByMatch,
      knockoutSavedAtByMatchNo: nextKnockoutSavedAtMap,
    };
    const top8Changed = shouldApplyTop8FromPost && !sameSortedNumberArray(existingPath.top8TeamIds, finalPathBase.top8TeamIds);
    const knockoutChanged = knockoutOpen && JSON.stringify(existingPath.winnersByMatch) !== JSON.stringify(payload.winnersByMatch);
    const existingKnockoutSubmittedBeforeOpen = existingKnockoutSubmittedAt ? isStrictlyBefore(existingKnockoutSubmittedAt, deadlines.knockoutOpenAt) : false;
    const top8SubmittedAt = shouldApplyTop8FromPost && finalPathBase.top8TeamIds.length === 8 && (top8Changed || !existingTop8SubmittedAt) ? now : existingTop8SubmittedAt;
    const knockoutSubmittedAt =
      knockoutOpen && Object.keys(payload.winnersByMatch).length > 0 && (knockoutChanged || !existingKnockoutSubmittedAt || existingKnockoutSubmittedBeforeOpen)
        ? now
        : existingKnockoutSubmittedAt;
    const finalPath = {
      ...finalPathBase,
      top8GroupSavedAtByLetter:
        shouldApplyTop8FromPost && nextTop8 && !("error" in nextTop8)
          ? top8SavedAtMapForTeamIds(finalPathBase.top8TeamIds, teamGroupById, {}, top8SubmittedAt)
          : existingTop8SavedAtMap,
    };

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name: user.email?.split("@")[0] ?? "Player",
        updated_at: now,
      },
      { onConflict: "id" },
    );

    const groupRows = groupOpen ? groupPredictionRows(user.id, nextGroupRankings, existingGroupsByName, now) : [];
    if (groupOpen && groupRows.length > 0) {
      const { error: groupPredictionError } = await supabase.from("group_predictions").upsert(groupRows, { onConflict: "user_id,group_name" });
      if (groupPredictionError) throw new Error(groupPredictionError.message);
    }

    if (knockoutOpen) {
      const bracketRows = bracketPredictionRows(user.id, payload.winnersByMatch, now);
      const { error: deleteBracketError } = await supabase.from("bracket_predictions").delete().eq("user_id", user.id).not("match_no", "is", null);
      if (deleteBracketError) throw new Error(deleteBracketError.message);
      if (bracketRows.length > 0) {
        const { error: bracketPredictionError } = await supabase.from("bracket_predictions").insert(bracketRows);
        if (bracketPredictionError) throw new Error(bracketPredictionError.message);
      }
    }

    const { data, error } = await supabase
      .from("tournament_predictions")
      .upsert(
        {
          user_id: user.id,
          champion_team_id: finalPath.champion,
          finalist_team_ids: finalPath.finalists,
          semi_finalist_team_ids: finalPath.semiFinalists,
          path: finalPath,
          top8_submitted_at: top8SubmittedAt,
          knockout_submitted_at: knockoutSubmittedAt,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("id,champion_team_id,finalist_team_ids,semi_finalist_team_ids,path,top8_submitted_at,knockout_submitted_at,updated_at")
      .single();

    if (error) throw new Error(error.message);
    const { data: savedGroups } = await supabase
      .from("group_predictions")
      .select("group_name,meaningful_updated_at,updated_at,created_at")
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      prediction: data,
      deadlines,
      groupSavedAtByLetter: groupSavedAtByLetter((savedGroups ?? []) as any[]),
      segmentStatuses: {
        groups: groupOpen ? "saved" : "preserved",
        top8: top8Open ? "saved" : top8Started ? "preserved" : "not_open",
        knockout: knockoutOpen ? "saved" : knockoutStarted ? "preserved" : "not_open",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tournament path payload." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Sign in before saving your tournament path." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save tournament path." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const payload = patchSchema.parse(await request.json());

    const deadlines = await getTournamentDeadlines();
    const now = new Date().toISOString();
    const top8Started = !isStrictlyBefore(now, deadlines.top8OpenAt);
    const top8Open = top8Started && isStrictlyBefore(now, deadlines.top8LockAt);
    if (!top8Open) {
      return NextResponse.json(
        { error: top8Started ? "Top 8 is locked. Previous valid picks are preserved." : "Top 8 is not open yet." },
        { status: 409 },
      );
    }

    const supabase = createAdminClient();
    const [{ data: existingTournament, error: existingError }, { data: teamRows, error: teamError }] = await Promise.all([
      supabase
        .from("tournament_predictions")
        .select("path,top8_submitted_at,knockout_submitted_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("teams").select("id,group_name").limit(500),
    ]);
    if (existingError) throw new Error(existingError.message);
    if (teamError) throw new Error(teamError.message);

    const teamGroupById = new Map(
      ((teamRows ?? []) as any[])
        .map((row) => {
          const teamId = Number(row.id);
          const groupName = canonicalWorldCupGroupName(row.group_name);
          const letter = groupName ? groupLetter(groupName) : null;
          return Number.isFinite(teamId) && letter ? [teamId, letter] : null;
        })
        .filter((entry): entry is [number, string] => Boolean(entry)),
    );
    const existingPath = existingPathSegment((existingTournament as any)?.path);
    const existingTop8SubmittedAt = (existingTournament as any)?.top8_submitted_at ?? null;
    const existingKnockoutSubmittedAt = (existingTournament as any)?.knockout_submitted_at ?? null;
    const currentSavedAtMap = top8SavedAtMapForTeamIds(
      existingPath.top8TeamIds,
      teamGroupById,
      existingPath.top8GroupSavedAtByLetter,
      existingTop8SubmittedAt,
    );

    let finalPath: ExistingPathSegment = existingPath;
    let top8SubmittedAt: string | null = existingTop8SubmittedAt;
    let knockoutSubmittedAt: string | null = existingKnockoutSubmittedAt;
    let shouldClearBracket = false;
    let top8Status = "saved";

    if (payload.action === "clear-top8") {
      finalPath = clearTop8AndKnockout(existingPath);
      top8SubmittedAt = null;
      knockoutSubmittedAt = null;
      shouldClearBracket = true;
      top8Status = "cleared";
    }

    if (payload.action === "save-top8-group") {
      const group = groupLetter(payload.group);
      if (!GROUP_LETTERS.includes(group)) {
        return NextResponse.json({ error: "That Top 8 group could not be identified." }, { status: 400 });
      }
      if (teamGroupById.get(payload.teamId) !== group) {
        return NextResponse.json({ error: `That team does not belong to Group ${group}.` }, { status: 400 });
      }

      const selectedByGroup = top8TeamIdByGroup(existingPath.top8TeamIds, teamGroupById);
      const previousTeamId = selectedByGroup.get(group) ?? null;
      const teamChanged = previousTeamId !== payload.teamId;
      selectedByGroup.set(group, payload.teamId);
      const nextTeamIds = GROUP_LETTERS.map((letter) => selectedByGroup.get(letter)).filter((teamId): teamId is number => Number.isFinite(teamId));
      const nextTop8 = validatePartialTop8TeamSelection(nextTeamIds, teamGroupById);
      if ("error" in nextTop8) {
        return NextResponse.json({ error: nextTop8.error }, { status: 400 });
      }

      const nextSavedAtMap = top8SavedAtMapForTeamIds(nextTop8.top8TeamIds, teamGroupById, currentSavedAtMap, null);
      if (teamChanged || !nextSavedAtMap[group]) nextSavedAtMap[group] = now;

      finalPath = {
        ...existingPath,
        top8TeamIds: nextTop8.top8TeamIds,
        thirdPlaceGroups: nextTop8.thirdPlaceGroups,
        thirdPlaceSlotTeamIds: nextTop8.thirdPlaceSlotTeamIds,
        top8GroupSavedAtByLetter: nextSavedAtMap,
      };
      if (teamChanged) {
        finalPath = clearKnockout(finalPath);
        knockoutSubmittedAt = null;
        shouldClearBracket = true;
      }
      top8SubmittedAt = top8CompleteWithSavedTimestamps(nextTop8.top8TeamIds, nextSavedAtMap, teamGroupById) ? latestSavedAt(nextSavedAtMap) : null;
      top8Status = top8SubmittedAt ? "saved" : "partial";
    }

    if (payload.action === "clear-top8-group") {
      const group = groupLetter(payload.group);
      if (!GROUP_LETTERS.includes(group)) {
        return NextResponse.json({ error: "That Top 8 group could not be identified." }, { status: 400 });
      }

      const selectedByGroup = top8TeamIdByGroup(existingPath.top8TeamIds, teamGroupById);
      if (!selectedByGroup.has(group)) {
        return NextResponse.json({ error: `Group ${group} does not have a saved Top 8 pick.` }, { status: 404 });
      }

      selectedByGroup.delete(group);
      const nextTeamIds = GROUP_LETTERS.map((letter) => selectedByGroup.get(letter)).filter((teamId): teamId is number => Number.isFinite(teamId));
      const nextTop8 = validatePartialTop8TeamSelection(nextTeamIds, teamGroupById);
      if ("error" in nextTop8) {
        return NextResponse.json({ error: nextTop8.error }, { status: 400 });
      }

      const nextSavedAtMap = top8SavedAtMapForTeamIds(nextTop8.top8TeamIds, teamGroupById, currentSavedAtMap, null);
      finalPath = clearKnockout({
        ...existingPath,
        top8TeamIds: nextTop8.top8TeamIds,
        thirdPlaceGroups: nextTop8.thirdPlaceGroups,
        thirdPlaceSlotTeamIds: nextTop8.thirdPlaceSlotTeamIds,
        top8GroupSavedAtByLetter: nextSavedAtMap,
      });
      top8SubmittedAt = null;
      knockoutSubmittedAt = null;
      shouldClearBracket = true;
      top8Status = nextTop8.top8TeamIds.length > 0 ? "partial" : "cleared";
    }

    if (shouldClearBracket) {
      const { error: bracketError } = await supabase.from("bracket_predictions").delete().eq("user_id", user.id).not("match_no", "is", null);
      if (bracketError) throw new Error(bracketError.message);
    }

    const { data, error } = await supabase
      .from("tournament_predictions")
      .upsert(
        {
          user_id: user.id,
          champion_team_id: finalPath.champion,
          finalist_team_ids: finalPath.finalists,
          semi_finalist_team_ids: finalPath.semiFinalists,
          path: finalPath,
          top8_submitted_at: top8SubmittedAt,
          knockout_submitted_at: knockoutSubmittedAt,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("id,champion_team_id,finalist_team_ids,semi_finalist_team_ids,path,top8_submitted_at,knockout_submitted_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      prediction: data,
      deadlines,
      segmentStatuses: {
        groups: "preserved",
        top8: top8Status,
        knockout: shouldClearBracket ? "cleared" : "preserved",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tournament path action." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Sign in before changing your tournament path." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update tournament path." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const deadlines = await getTournamentDeadlines();
    if (!isStrictlyBefore(new Date(), deadlines.groupCutoffAt)) {
      return NextResponse.json(
        { error: "Tournament path segments have started locking. Previous valid picks are preserved." },
        { status: 409 },
      );
    }

    const supabase = createAdminClient();
    const [{ error: tournamentError }, { error: groupError }, { error: bracketError }] = await Promise.all([
      supabase.from("tournament_predictions").delete().eq("user_id", user.id),
      supabase.from("group_predictions").delete().eq("user_id", user.id),
      supabase.from("bracket_predictions").delete().eq("user_id", user.id).not("match_no", "is", null),
    ]);
    if (tournamentError) throw new Error(tournamentError.message);
    if (groupError) throw new Error(groupError.message);
    if (bracketError) throw new Error(bracketError.message);

    return NextResponse.json({ ok: true, unsubmitted: true, deadlines });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Sign in before changing your tournament path." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not unsubmit tournament path." }, { status: 500 });
  }
}
