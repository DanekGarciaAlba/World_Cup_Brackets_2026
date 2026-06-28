import type { ScoreReason } from "./scoringTypes";
import type { TimingResult } from "./timing";

export type GroupPredictionInput = {
  predictedTeamIds?: number[];
  actualTeamIds?: number[];
  actualThirdPlaceQualifierTeamIds?: number[];
  predictedAt?: string | Date | null;
  groupLockAt?: string | Date | null;
  groupCutoffAt?: string | Date | null;
  firstRoundKickoffA?: string | Date | null;
  firstRoundKickoffB?: string | Date | null;
};

function groupTiming(submittedAt?: string | Date | null, cutoffAt?: string | Date | null): TimingResult {
  if (!submittedAt || !cutoffAt) {
    return { bucket: "pending_deadline", multiplier: 0, multiplierBP: 0, eligible: false, hoursBeforeDeadline: null };
  }

  const submitted = new Date(submittedAt).getTime();
  const cutoff = new Date(cutoffAt).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(cutoff)) {
    return { bucket: "pending_deadline", multiplier: 0, multiplierBP: 0, eligible: false, hoursBeforeDeadline: null };
  }

  const hoursBeforeDeadline = (cutoff - submitted) / 36e5;
  if (submitted >= cutoff) {
    return { bucket: "after_group_cutoff", multiplier: 0, multiplierBP: 0, eligible: false, hoursBeforeDeadline };
  }

  return { bucket: "group_window", multiplier: 1, multiplierBP: 100, eligible: true, hoursBeforeDeadline };
}

function hasStarted(submittedAt: string | Date | null | undefined, kickoffAt: string | Date | null | undefined) {
  if (!submittedAt || !kickoffAt) return false;
  const submitted = new Date(submittedAt).getTime();
  const kickoff = new Date(kickoffAt).getTime();
  return Number.isFinite(submitted) && Number.isFinite(kickoff) && submitted >= kickoff;
}

export function groupPointValues(input: Pick<GroupPredictionInput, "predictedAt" | "firstRoundKickoffA" | "firstRoundKickoffB">) {
  const startedCount = [input.firstRoundKickoffA, input.firstRoundKickoffB].filter((kickoff) => hasStarted(input.predictedAt, kickoff)).length;
  if (startedCount >= 2) return { first: 3, second: 2, third: 1 };
  if (startedCount === 1) return { first: 4, second: 3, third: 2 };
  return { first: 6, second: 4, third: 3 };
}

export function calculateGroupPredictionPoints(input: GroupPredictionInput = {}) {
  const predicted = input.predictedTeamIds ?? [];
  const actual = input.actualTeamIds ?? [];
  const reasons: ScoreReason[] = [];
  const timing = groupTiming(input.predictedAt, input.groupCutoffAt ?? input.groupLockAt);
  const pointValues = groupPointValues(input);

  if (predicted.length === 0 || actual.length === 0) return { total: 0, basePoints: 0, timing, pointValues, reasons };

  if (!timing.eligible) {
    return {
      total: 0,
      basePoints: 0,
      timing,
      pointValues,
      reasons: [{ code: timing.bucket, points: 0, description: "Group prediction is not eligible for points yet" }],
    };
  }

  if (predicted[0] && predicted[0] === actual[0]) {
    reasons.push({ code: "group_first_exact", points: pointValues.first, description: "Correct group winner" });
  }

  if (predicted[1] && predicted[1] === actual[1]) {
    reasons.push({ code: "group_second_exact", points: pointValues.second, description: "Correct group runner-up" });
  }

  if (predicted[2] && predicted[2] === actual[2]) {
    reasons.push({ code: "group_third_exact", points: pointValues.third, description: "Correct group third place" });
  }

  const basePoints = reasons.reduce((sum, reason) => sum + reason.points, 0);

  return {
    total: basePoints,
    basePoints,
    timing,
    pointValues,
    reasons,
  };
}
