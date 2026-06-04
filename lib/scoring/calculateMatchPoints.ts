import type { MatchPrediction, MatchResult, ScoreReason } from "@/lib/scoring/scoringTypes";

function outcome(home: number, away: number) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calculateMatchPoints(prediction: MatchPrediction, result: MatchResult) {
  const reasons: ScoreReason[] = [];

  if (outcome(prediction.homeScore, prediction.awayScore) === outcome(result.homeScore, result.awayScore)) {
    reasons.push({ code: "correct_outcome", points: 3, description: "Correct match outcome" });
  }

  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) {
    reasons.push({ code: "exact_score", points: 2, description: "Exact score bonus" });
  }

  if (prediction.homeScore - prediction.awayScore === result.homeScore - result.awayScore) {
    reasons.push({ code: "goal_difference", points: 1, description: "Correct goal difference" });
  }

  if (prediction.homeScore === result.homeScore || prediction.awayScore === result.awayScore) {
    reasons.push({ code: "team_goals", points: 1, description: "Correct goals for one team" });
  }

  return {
    total: reasons.reduce((sum, reason) => sum + reason.points, 0),
    reasons,
  };
}
