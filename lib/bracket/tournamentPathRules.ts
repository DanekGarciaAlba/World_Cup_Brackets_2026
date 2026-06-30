export type WinnerResolvableMatch = {
  matchNo: number;
  teams: [number | null, number | null];
};

export const ROUND_OF_32_MATCH_NUMBERS = Array.from({ length: 16 }, (_, index) => 73 + index);

export const KNOCKOUT_ADVANCEMENT_MATCHES = [
  { matchNo: 89, from: [73, 75], roundKey: "roundOf16" },
  { matchNo: 90, from: [74, 77], roundKey: "roundOf16" },
  { matchNo: 91, from: [76, 78], roundKey: "roundOf16" },
  { matchNo: 92, from: [79, 80], roundKey: "roundOf16" },
  { matchNo: 93, from: [83, 84], roundKey: "roundOf16" },
  { matchNo: 94, from: [81, 82], roundKey: "roundOf16" },
  { matchNo: 95, from: [86, 88], roundKey: "roundOf16" },
  { matchNo: 96, from: [85, 87], roundKey: "roundOf16" },
  { matchNo: 97, from: [89, 90], roundKey: "quarterFinals" },
  { matchNo: 98, from: [93, 94], roundKey: "quarterFinals" },
  { matchNo: 99, from: [91, 92], roundKey: "quarterFinals" },
  { matchNo: 100, from: [95, 96], roundKey: "quarterFinals" },
  { matchNo: 101, from: [97, 98], roundKey: "semiFinals" },
  { matchNo: 102, from: [99, 100], roundKey: "semiFinals" },
] as const;

export const KNOCKOUT_TERMINAL_MATCHES = [
  { matchNo: 103, from: [101, 102], roundKey: "thirdPlace" },
  { matchNo: 104, from: [101, 102], roundKey: "final" },
] as const;

export const KNOCKOUT_MATCH_NUMBERS = [
  ...ROUND_OF_32_MATCH_NUMBERS,
  ...KNOCKOUT_ADVANCEMENT_MATCHES.map((match) => match.matchNo),
  ...KNOCKOUT_TERMINAL_MATCHES.map((match) => match.matchNo),
];

export const PERFECT_ROUND_OF_32_BONUS_POINTS = 30;

export type KnockoutRoundKey = "roundOf32" | "roundOf16" | "quarterFinals" | "semiFinals" | "thirdPlace" | "final";

export type KnockoutScheduledMatch = {
  kickoff_at?: string | null;
  kickoffAt?: string | null;
  round?: string | null;
  stage?: string | null;
  status?: string | null;
  home_team_id?: number | string | null;
  away_team_id?: number | string | null;
  homeTeamId?: number | string | null;
  awayTeamId?: number | string | null;
  homeTeam?: { id?: number | string | null } | null;
  awayTeam?: { id?: number | string | null } | null;
  home_score?: number | string | null;
  away_score?: number | string | null;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  penalty_home_score?: number | string | null;
  penalty_away_score?: number | string | null;
  penaltyHomeScore?: number | string | null;
  penaltyAwayScore?: number | string | null;
};

export type KnockoutPointDetail = {
  matchNo: number;
  roundKey: KnockoutRoundKey;
  basePoints: number;
  originalCandidates: number;
  possibleCandidates: number;
  points: number;
};

const KNOCKOUT_ROUND_MATCH_NUMBERS: Record<KnockoutRoundKey, number[]> = {
  roundOf32: ROUND_OF_32_MATCH_NUMBERS,
  roundOf16: KNOCKOUT_ADVANCEMENT_MATCHES.filter((match) => match.roundKey === "roundOf16").map((match) => match.matchNo),
  quarterFinals: KNOCKOUT_ADVANCEMENT_MATCHES.filter((match) => match.roundKey === "quarterFinals").map((match) => match.matchNo),
  semiFinals: KNOCKOUT_ADVANCEMENT_MATCHES.filter((match) => match.roundKey === "semiFinals").map((match) => match.matchNo),
  thirdPlace: [103],
  final: [104],
};

const KNOCKOUT_POINT_VALUES: Record<KnockoutRoundKey, { basePoints: number; originalCandidates: number }> = {
  roundOf32: { basePoints: 4, originalCandidates: 2 },
  roundOf16: { basePoints: 8, originalCandidates: 4 },
  quarterFinals: { basePoints: 14, originalCandidates: 8 },
  semiFinals: { basePoints: 25, originalCandidates: 16 },
  thirdPlace: { basePoints: 26, originalCandidates: 32 },
  final: { basePoints: 60, originalCandidates: 32 },
};

const FEEDERS_BY_MATCH_NO = new Map<number, readonly number[]>(
  [...KNOCKOUT_ADVANCEMENT_MATCHES, ...KNOCKOUT_TERMINAL_MATCHES].map((match) => [match.matchNo, match.from]),
);

function normalizeWinnerId(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function kickoffOf(match: KnockoutScheduledMatch) {
  return match.kickoff_at ?? match.kickoffAt ?? null;
}

function numberOrNull(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function matchTeamIds(match: KnockoutScheduledMatch) {
  return [
    numberOrNull(match.home_team_id ?? match.homeTeamId ?? match.homeTeam?.id),
    numberOrNull(match.away_team_id ?? match.awayTeamId ?? match.awayTeam?.id),
  ] as const;
}

function timeOf(value: string | Date | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function resolveKnockoutWinnerTeamId(match: KnockoutScheduledMatch) {
  if (String(match.status ?? "").toLowerCase() !== "finished") return null;
  const [homeTeamId, awayTeamId] = matchTeamIds(match);
  if (homeTeamId === null || awayTeamId === null) return null;

  const homeScore = numberOrNull(match.home_score ?? match.homeScore);
  const awayScore = numberOrNull(match.away_score ?? match.awayScore);
  if (homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) return homeTeamId;
    if (awayScore > homeScore) return awayTeamId;
  }

  const penaltyHomeScore = numberOrNull(match.penalty_home_score ?? match.penaltyHomeScore);
  const penaltyAwayScore = numberOrNull(match.penalty_away_score ?? match.penaltyAwayScore);
  if (penaltyHomeScore !== null && penaltyAwayScore !== null) {
    if (penaltyHomeScore > penaltyAwayScore) return homeTeamId;
    if (penaltyAwayScore > penaltyHomeScore) return awayTeamId;
  }

  return null;
}

export function isRoundOf32MatchNo(matchNo: number) {
  return matchNo >= 73 && matchNo <= 88;
}

export function knockoutRoundKeyForMatchNo(matchNo: number): KnockoutRoundKey | null {
  if (matchNo >= 73 && matchNo <= 88) return "roundOf32";
  if (matchNo >= 89 && matchNo <= 96) return "roundOf16";
  if (matchNo >= 97 && matchNo <= 100) return "quarterFinals";
  if (matchNo >= 101 && matchNo <= 102) return "semiFinals";
  if (matchNo === 103) return "thirdPlace";
  if (matchNo === 104) return "final";
  return null;
}

export function knockoutMatchNumbersForRoundKey(roundKey: KnockoutRoundKey) {
  return KNOCKOUT_ROUND_MATCH_NUMBERS[roundKey] ?? [];
}

export function knockoutRoundLabel(roundKey: KnockoutRoundKey) {
  if (roundKey === "roundOf32") return "Round of 32";
  if (roundKey === "roundOf16") return "Round of 16";
  if (roundKey === "quarterFinals") return "Quarter-final";
  if (roundKey === "semiFinals") return "Semi-final";
  if (roundKey === "thirdPlace") return "Third-place";
  return "Champion";
}

export function knockoutBasePointsForMatchNo(matchNo: number) {
  const roundKey = knockoutRoundKeyForMatchNo(matchNo);
  return roundKey ? KNOCKOUT_POINT_VALUES[roundKey].basePoints : 0;
}

export function assignKnockoutMatchNumbers<T extends KnockoutScheduledMatch>(matches: T[]) {
  const grouped = new Map<KnockoutRoundKey, T[]>();

  for (const match of matches) {
    const roundKey = knockoutRoundKeyFromMatch(match);
    if (!roundKey) continue;
    const rows = grouped.get(roundKey) ?? [];
    rows.push(match);
    grouped.set(roundKey, rows);
  }

  const numbered: Array<{ matchNo: number; roundKey: KnockoutRoundKey; match: T }> = [];
  for (const roundKey of ["roundOf32", "roundOf16", "quarterFinals", "semiFinals", "thirdPlace", "final"] as const) {
    const matchNumbers = knockoutMatchNumbersForRoundKey(roundKey);
    const rows = [...(grouped.get(roundKey) ?? [])].sort((a, b) => {
      const byTime = (timeOf(kickoffOf(a)) ?? Number.MAX_SAFE_INTEGER) - (timeOf(kickoffOf(b)) ?? Number.MAX_SAFE_INTEGER);
      return byTime;
    });
    rows.forEach((match, index) => {
      const matchNo = matchNumbers[index];
      if (matchNo) numbered.push({ matchNo, roundKey, match });
    });
  }

  return numbered;
}

export function knockoutKickoffByMatchNo(matches: KnockoutScheduledMatch[]) {
  return Object.fromEntries(
    assignKnockoutMatchNumbers(matches)
      .map(({ matchNo, match }) => [String(matchNo), kickoffOf(match) ?? null] as const)
      .filter(([, kickoff]) => Boolean(kickoff)),
  );
}

export function knockoutRoundKeyFromMatch(match: Pick<KnockoutScheduledMatch, "round" | "stage">): KnockoutRoundKey | null {
  const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase().replace(/_/g, " ");
  if (text.includes("round of 32")) return "roundOf32";
  if (text.includes("round of 16")) return "roundOf16";
  if (text.includes("quarter")) return "quarterFinals";
  if (text.includes("semi")) return "semiFinals";
  if (text.includes("third")) return "thirdPlace";
  if (/\bfinal\b/.test(text) && !text.includes("semi") && !text.includes("third")) return "final";
  return null;
}

function matchStartedAtSubmission(matchNo: number, submittedAt: string | Date | null | undefined, kickoffByMatchNo?: Record<string, string | Date | null | undefined>) {
  const submitted = timeOf(submittedAt);
  const kickoff = timeOf(kickoffByMatchNo?.[String(matchNo)] ?? null);
  if (submitted === null || kickoff === null) return false;
  return submitted >= kickoff;
}

export function possibleKnockoutCandidatesAtSubmission(
  matchNo: number,
  submittedAt: string | Date | null | undefined,
  kickoffByMatchNo: Record<string, string | Date | null | undefined> = {},
): number {
  const roundKey = knockoutRoundKeyForMatchNo(matchNo);
  if (!roundKey) return 0;
  if (matchStartedAtSubmission(matchNo, submittedAt, kickoffByMatchNo)) return 0;
  if (roundKey === "roundOf32") return 2;

  const feeders = FEEDERS_BY_MATCH_NO.get(matchNo);
  if (!feeders) return KNOCKOUT_POINT_VALUES[roundKey].originalCandidates;

  return feeders.reduce((sum, feederMatchNo) => {
    if (matchStartedAtSubmission(feederMatchNo, submittedAt, kickoffByMatchNo)) return sum + 1;
    return sum + possibleKnockoutCandidatesAtSubmission(feederMatchNo, submittedAt, kickoffByMatchNo);
  }, 0);
}

export function informationAdjustedKnockoutPoints(
  matchNo: number,
  submittedAt: string | Date | null | undefined,
  kickoffByMatchNo: Record<string, string | Date | null | undefined> = {},
): KnockoutPointDetail {
  const roundKey = knockoutRoundKeyForMatchNo(matchNo) ?? "roundOf32";
  const pointValue = KNOCKOUT_POINT_VALUES[roundKey];
  const possibleCandidates = possibleKnockoutCandidatesAtSubmission(matchNo, submittedAt, kickoffByMatchNo);
  return {
    matchNo,
    roundKey,
    basePoints: pointValue.basePoints,
    originalCandidates: pointValue.originalCandidates,
    possibleCandidates,
    points: Math.floor((pointValue.basePoints * possibleCandidates) / pointValue.originalCandidates),
  };
}

export function pruneInvalidWinnersByMatch(
  winnersByMatch: Record<string, number | null>,
  matches: WinnerResolvableMatch[],
) {
  const teamsByMatch = new Map(matches.map((match) => [String(match.matchNo), match.teams]));
  let changed = false;
  const next: Record<string, number | null> = {};

  for (const [matchNo, winner] of Object.entries(winnersByMatch)) {
    const teams = teamsByMatch.get(matchNo);
    const winnerId = normalizeWinnerId(winner);
    if (!teams || !winnerId || !teams.includes(winnerId)) {
      changed = true;
      continue;
    }
    next[matchNo] = winnerId;
    if (winnerId !== winner) changed = true;
  }

  return changed ? next : winnersByMatch;
}
