import type { MatchPrediction, MatchResult, ScoreReason } from "@/lib/scoring/scoringTypes";

function outcome(home: number, away: number) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function hoursBeforeKickoff(predictedAt?: string | Date | null, kickoffAt?: string | Date | null) {
  if (!predictedAt || !kickoffAt) return 0;
  const predicted = new Date(predictedAt).getTime();
  const kickoff = new Date(kickoffAt).getTime();
  if (!Number.isFinite(predicted) || !Number.isFinite(kickoff)) return 0;
  return (kickoff - predicted) / 36e5;
}

export function calculateMatchPoints(prediction: MatchPrediction, result: MatchResult) {
  const reasons: ScoreReason[] = [];
  const predictionOutcome = outcome(prediction.homeScore, prediction.awayScore);
  const resultOutcome = outcome(result.homeScore, result.awayScore);
  const correctOutcome = predictionOutcome === resultOutcome;

  if (correctOutcome) {
    reasons.push({ code: "correct_outcome", points: 3, description: "Correct match outcome" });
  } else {
    reasons.push({ code: "wrong_outcome", points: -1, description: "Wrong match outcome penalty" });
  }

  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) {
    reasons.push({ code: "exact_score", points: 5, description: "Exact score bonus" });
  }

  if (prediction.homeScore - prediction.awayScore === result.homeScore - result.awayScore) {
    reasons.push({ code: "goal_difference", points: 2, description: "Correct goal difference" });
  }

  if (prediction.homeScore === result.homeScore || prediction.awayScore === result.awayScore) {
    reasons.push({ code: "team_goals", points: 1, description: "Correct goals for one team" });
  }

  if (prediction.homeScore + prediction.awayScore === result.homeScore + result.awayScore) {
    reasons.push({ code: "total_goals", points: 1, description: "Correct total goals" });
  }

  const earlyHours = hoursBeforeKickoff(prediction.predictedAt, prediction.kickoffAt);
  if (earlyHours >= 72) {
    reasons.push({ code: "early_save_72h", points: 2, description: "Saved at least 72 hours before kickoff" });
  } else if (earlyHours >= 24) {
    reasons.push({ code: "early_save_24h", points: 1, description: "Saved at least 24 hours before kickoff" });
  }

  if (prediction.boostApplied) {
    reasons.push(
      correctOutcome
        ? { code: "boost_correct", points: 2, description: "Boosted correct outcome" }
        : { code: "boost_wrong", points: -1, description: "Boosted wrong outcome penalty" },
    );
  }

  return {
    total: reasons.reduce((sum, reason) => sum + reason.points, 0),
    reasons,
  };
}
