export type ProfileBracketTeam = {
  id: number;
  name: string;
  code?: string | null;
  country?: string | null;
};

export type ProfileBracketPath = {
  roundOf32: number[];
  roundOf16: number[];
  quarterFinalists: number[];
  semiFinalists: number[];
  finalists: number[];
  champion: number | null;
  thirdPlaceWinner: number | null;
  groupRankings: Record<string, number[]>;
  thirdPlaceGroups: string[];
  winnersByMatch: Record<string, number | null>;
};

export type ProfileBracketSummary = {
  savedAt: string | null;
  complete: boolean;
  pickedMatches: number;
  champion: ProfileBracketTeam | null;
  finalists: ProfileBracketTeam[];
  semiFinalists: ProfileBracketTeam[];
  quarterFinalists: ProfileBracketTeam[];
  thirdPlaceWinner: ProfileBracketTeam | null;
  topThirds: ProfileBracketTeam[];
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

export function parseProfileBracketPath(value: unknown): ProfileBracketPath | null {
  if (!isRecord(value)) return null;

  const groupRankings = isRecord(value.groupRankings)
    ? Object.fromEntries(Object.entries(value.groupRankings).map(([key, ranking]) => [key.replace(/^Group\s+/i, ""), numberArray(ranking)]))
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
    thirdPlaceGroups: Array.isArray(value.thirdPlaceGroups) ? value.thirdPlaceGroups.map((group) => String(group).replace(/^Group\s+/i, "")) : [],
    winnersByMatch: numberRecord(value.winnersByMatch),
  };
}

function teamsFromIds(ids: number[], teamsById: Map<number, ProfileBracketTeam>) {
  return ids.map((id) => teamsById.get(id) ?? null).filter((team): team is ProfileBracketTeam => Boolean(team));
}

export function buildProfileBracketSummary(
  path: ProfileBracketPath | null,
  teams: ProfileBracketTeam[],
  savedAt: string | null,
): ProfileBracketSummary | null {
  if (!path) return null;

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const pickedMatches = Object.values(path.winnersByMatch).filter((teamId) => Number(teamId) > 0).length;
  const topThirds = path.thirdPlaceGroups
    .map((group) => teamsById.get(path.groupRankings[group]?.[2] ?? 0) ?? null)
    .filter((team): team is ProfileBracketTeam => Boolean(team));

  return {
    savedAt,
    complete: Boolean(path.champion && pickedMatches >= 32),
    pickedMatches,
    champion: path.champion ? teamsById.get(path.champion) ?? null : null,
    finalists: teamsFromIds(path.finalists, teamsById),
    semiFinalists: teamsFromIds(path.semiFinalists, teamsById),
    quarterFinalists: teamsFromIds(path.quarterFinalists, teamsById),
    thirdPlaceWinner: path.thirdPlaceWinner ? teamsById.get(path.thirdPlaceWinner) ?? null : null,
    topThirds,
  };
}
