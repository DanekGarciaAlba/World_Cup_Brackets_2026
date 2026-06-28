import type { MatchPrediction, MatchResult, ScoreReason } from "./scoringTypes";
import { applyBasisPointMultiplier, resolveFixtureTiming, resolveMatchStageMultiplier } from "./timing";

export function matchOutcome(home: number, away: number) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function isAdvancerScoringStage(stage?: string | null) {
  const normalized = String(stage ?? "group").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized.includes("group")) return false;
  return (
    normalized.includes("round_of_32") ||
    normalized.includes("round_of_16") ||
    normalized.includes("quarter") ||
    normalized.includes("semi") ||
    normalized.includes("third") ||
    normalized.includes("final")
  );
}

export function calculateMatchPoints(prediction: MatchPrediction, result: MatchResult) {
  const reasons: ScoreReason[] = [];
  const predictionWithAdvancer = prediction as MatchPrediction & { predictedAdvancerTeamId?: number | null };
  const resultWithAdvancer = result as MatchResult & { winnerTeamId?: number | null; penaltyWinnerTeamId?: number | null };
  const predictionOutcome = matchOutcome(prediction.homeScore, prediction.awayScore);
  const resultOutcome = matchOutcome(result.homeScore, result.awayScore);
  const resultAdvancerTeamId = resultWithAdvancer.winnerTeamId ?? resultWithAdvancer.penaltyWinnerTeamId ?? null;
  const usesAdvancer =
    isAdvancerScoringStage(prediction.stage) &&
    predictionWithAdvancer.predictedAdvancerTeamId !== null &&
    predictionWithAdvancer.predictedAdvancerTeamId !== undefined &&
    resultAdvancerTeamId !== null;
  const correctOutcome = usesAdvancer ? predictionWithAdvancer.predictedAdvancerTeamId === resultAdvancerTeamId : predictionOutcome === resultOutcome;
  const timing = resolveFixtureTiming(prediction.predictedAt, prediction.kickoffAt, prediction.stage);
  const stage = resolveMatchStageMultiplier(prediction.stage);

  if (!timing.eligible) {
    return {
      total: 0,
      basePoints: 0,
      timing,
      stage,
      reasons: [{ code: "after_kickoff", points: 0, description: "Prediction submitted after kickoff" }],
    };
  }

  if (!correctOutcome) {
    return {
      total: 0,
      basePoints: 0,
      timing,
      stage,
      reasons: [
        {
          code: usesAdvancer ? "wrong_advancer" : "wrong_outcome",
          points: 0,
          description: usesAdvancer ? "Wrong advancing team" : "Wrong match outcome",
        },
      ],
    };
  }

  reasons.push({
    code: usesAdvancer ? "correct_advancer" : "correct_outcome",
    points: 4,
    description: usesAdvancer ? "Correct advancing team" : "Correct match outcome",
  });

  if (result.awarded) {
    const basePoints = reasons.reduce((sum, reason) => sum + reason.points, 0);
    return {
      total: applyBasisPointMultiplier(basePoints, timing.multiplierBP, stage.multiplierBP),
      basePoints,
      timing,
      stage,
      reasons,
    };
  }

  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) {
    reasons.push({ code: "exact_score", points: 6, description: "Exact score bonus" });
  }

  if (prediction.homeScore - prediction.awayScore === result.homeScore - result.awayScore) {
    reasons.push({ code: "goal_difference", points: 2, description: "Correct goal difference" });
  }

  if (prediction.homeScore === result.homeScore) {
    reasons.push({ code: "home_goals", points: 1, description: "Correct home team goals" });
  }

  if (prediction.awayScore === result.awayScore) {
    reasons.push({ code: "away_goals", points: 1, description: "Correct away team goals" });
  }

  const basePoints = reasons.reduce((sum, reason) => sum + reason.points, 0);

  return {
    total: applyBasisPointMultiplier(basePoints, timing.multiplierBP, stage.multiplierBP),
    basePoints,
    timing,
    stage,
    reasons,
  };
}
