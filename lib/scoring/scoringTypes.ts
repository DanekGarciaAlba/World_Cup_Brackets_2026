export type MatchPrediction = {
  homeScore: number;
  awayScore: number;
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
