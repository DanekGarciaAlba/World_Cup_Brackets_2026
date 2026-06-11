export type RecentMatchScore = {
  matchId: number;
  matchLabel: string;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  predictedScoreLabel: string;
  actualScoreLabel: string;
  points: number;
  exactScore: boolean;
  correctOutcome: boolean;
  timingMultiplier: number | null;
  scoredAt: string | null;
};

export function matchScoreAcknowledgementKey(score: Pick<RecentMatchScore, "matchId" | "actualScoreLabel" | "points">) {
  return `${score.matchId}:${score.actualScoreLabel}:${score.points}`;
}

export function filterUnacknowledgedMatchScores(scores: RecentMatchScore[], acknowledgedKeys: ReadonlySet<string>) {
  return scores.filter((score) => !acknowledgedKeys.has(matchScoreAcknowledgementKey(score)));
}
