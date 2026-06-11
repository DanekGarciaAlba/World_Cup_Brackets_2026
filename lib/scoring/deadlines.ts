export const FALLBACK_TOURNAMENT_START_AT = "2026-06-11T19:00:00.000Z";
export const FALLBACK_GROUP_CUTOFF_AT = "2026-06-18T14:00:00.000Z";
export const FALLBACK_TOP8_OPEN_AT = FALLBACK_GROUP_CUTOFF_AT;
export const FALLBACK_TOP8_LOCK_AT = "2026-06-24T19:00:00.000Z";
export const FALLBACK_KNOCKOUT_LOCK_AT = "2026-06-28T19:00:00.000Z";

export type DeadlineMatch = {
  kickoff_at?: string | null;
  kickoffAt?: string | null;
  group_name?: string | null;
  groupName?: string | null;
  round?: string | null;
  stage?: string | null;
  home_team_id?: number | string | null;
  homeTeamId?: number | string | null;
  away_team_id?: number | string | null;
  awayTeamId?: number | string | null;
};

export type WorldCupDeadlines = {
  tournamentStartAt: string;
  groupCutoffAt: string;
  top8OpenAt: string;
  top8LockAt: string;
  knockoutLockAt: string;
};

function kickoffOf(match: DeadlineMatch) {
  return match.kickoff_at ?? match.kickoffAt ?? null;
}

function groupOf(match: DeadlineMatch) {
  return match.group_name ?? match.groupName ?? null;
}

function teamIds(match: DeadlineMatch) {
  const home = Number(match.home_team_id ?? match.homeTeamId);
  const away = Number(match.away_team_id ?? match.awayTeamId);
  return [home, away].filter((teamId) => Number.isFinite(teamId) && teamId > 0);
}

function isKnockoutRound(match: DeadlineMatch) {
  const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
  return text.includes("round of 32") || text.includes("round_of_32");
}

function safeIso(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function minusHours(value: string, hours: number) {
  return new Date(new Date(value).getTime() - hours * 36e5).toISOString();
}

export function deriveWorldCupDeadlines(matches: DeadlineMatch[] = []): WorldCupDeadlines {
  const sorted = [...matches]
    .filter((match) => kickoffOf(match))
    .sort((a, b) => new Date(kickoffOf(a) ?? "").getTime() - new Date(kickoffOf(b) ?? "").getTime());

  const tournamentStartAt = safeIso(sorted[0] ? kickoffOf(sorted[0]) : null, FALLBACK_TOURNAMENT_START_AT);
  const groupMatches = sorted.filter((match) => groupOf(match));
  const appearancesByTeam = new Map<number, number>();
  let firstMatchday2At: string | null = null;
  let firstMatchday3At: string | null = null;

  for (const match of groupMatches) {
    const kickoff = kickoffOf(match);
    const ids = teamIds(match);
    const previousMax = Math.max(...ids.map((teamId) => appearancesByTeam.get(teamId) ?? 0), 0);
    if (!firstMatchday2At && previousMax >= 1 && kickoff) firstMatchday2At = kickoff;
    if (!firstMatchday3At && previousMax >= 2 && kickoff) firstMatchday3At = kickoff;
    for (const teamId of ids) {
      appearancesByTeam.set(teamId, (appearancesByTeam.get(teamId) ?? 0) + 1);
    }
  }

  const firstRoundOf32 = sorted.find(isKnockoutRound);
  const firstRoundOf32At = firstRoundOf32 ? kickoffOf(firstRoundOf32) : null;
  const groupCutoffAt = firstMatchday2At ? minusHours(safeIso(firstMatchday2At, FALLBACK_GROUP_CUTOFF_AT), 2) : FALLBACK_GROUP_CUTOFF_AT;
  const top8LockAt = safeIso(firstMatchday3At, FALLBACK_TOP8_LOCK_AT);

  return {
    tournamentStartAt,
    groupCutoffAt,
    top8OpenAt: groupCutoffAt,
    top8LockAt,
    knockoutLockAt: safeIso(firstRoundOf32At, FALLBACK_KNOCKOUT_LOCK_AT),
  };
}

export function isStrictlyBefore(submittedAt: string | Date, lockAt: string | Date) {
  const submitted = new Date(submittedAt).getTime();
  const lock = new Date(lockAt).getTime();
  return Number.isFinite(submitted) && Number.isFinite(lock) && submitted < lock;
}
