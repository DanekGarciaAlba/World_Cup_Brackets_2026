export type WinnerResolvableMatch = {
  matchNo: number;
  teams: [number | null, number | null];
};

function normalizeWinnerId(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
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
