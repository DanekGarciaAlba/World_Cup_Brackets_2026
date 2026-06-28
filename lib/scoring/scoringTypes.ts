export type MatchStageKey = "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";

export type MatchPrediction = {
  homeScore: number;
  awayScore: number;
  boostApplied?: boolean;
  predictedAt?: string | Date | null;
  kickoffAt?: string | Date | null;
  predictedPenaltyWinnerTeamId?: number | null;
  predictedAdvancerTeamId?: number | null;
  stage?: MatchStageKey | string | null;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId?: number | null;
  winnerTeamId?: number | null;
  awarded?: boolean;
};

export type ScoreReason = {
  code: string;
  points: number;
  description: string;
};
