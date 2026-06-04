export type MatchPrediction = {
  homeScore: number;
  awayScore: number;
  boostApplied?: boolean;
  predictedAt?: string | Date | null;
  kickoffAt?: string | Date | null;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export type ScoreReason = {
  code: string;
  points: number;
  description: string;
};
