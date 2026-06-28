import type { ScoreReason } from "./scoringTypes";
import {
  KNOCKOUT_MATCH_NUMBERS,
  PERFECT_ROUND_OF_32_BONUS_POINTS,
  ROUND_OF_32_MATCH_NUMBERS,
  informationAdjustedKnockoutPoints,
  knockoutRoundLabel,
} from "@/lib/bracket/tournamentPathRules";
import {
  applyBasisPointMultiplier,
  resolveBracketTiming,
  resolveKnockoutTiming,
  resolveTop8PickPoints,
  TOP8_PERFECT_BONUS_POINTS,
  type TimingResult,
} from "./timing";

export type TournamentPathPrediction = {
  roundOf32TeamIds?: number[];
  roundOf16TeamIds?: number[];
  quarterFinalistTeamIds?: number[];
  semiFinalistTeamIds?: number[];
  finalistTeamIds?: number[];
  championTeamId?: number | null;
  thirdPlaceWinnerTeamId?: number | null;
  winnersByMatch?: Record<string, number | null | undefined>;
  knockoutSavedAtByMatchNo?: Record<string, string | Date | null | undefined>;
  knockoutMatchKickoffByMatchNo?: Record<string, string | Date | null | undefined>;
  predictedAt?: string | Date | null;
  firstKickoffAt?: string | Date | null;
  knockoutOpenAt?: string | Date | null;
  knockoutLockAt?: string | Date | null;
};

export type TournamentPathResult = {
  roundOf32TeamIds?: number[];
  roundOf16TeamIds?: number[];
  quarterFinalistTeamIds?: number[];
  semiFinalistTeamIds?: number[];
  finalistTeamIds?: number[];
  championTeamId?: number | null;
  thirdPlaceWinnerTeamId?: number | null;
  winnersByMatch?: Record<string, number | null | undefined>;
};

const roundPointValues = [
  { key: "roundOf16TeamIds", code: "bracket_reached_round_of_16", points: 4, label: "Round of 16 team" },
  { key: "quarterFinalistTeamIds", code: "bracket_reached_quarter_final", points: 8, label: "Quarter-finalist" },
  { key: "semiFinalistTeamIds", code: "bracket_reached_semi_final", points: 14, label: "Semi-finalist" },
  { key: "finalistTeamIds", code: "bracket_finalist", points: 25, label: "Finalist" },
] as const;

export type Top8PickPointDetail = {
  teamId: number;
  correct: boolean;
  savedAt: string | null;
  points: number;
  pointsPerCorrectTeam: number;
  timingBucket: string;
  eligible: boolean;
  hoursBeforeDeadline: number | null;
};

function scoreRound(predictedTeamIds: number[] | undefined, actualTeamIds: number[] | undefined, points: number, code: string, label: string) {
  const actual = new Set(actualTeamIds ?? []);
  const hits = (predictedTeamIds ?? []).filter((teamId) => actual.has(teamId)).length;
  if (hits === 0) return null;
  return {
    code,
    points: hits * points,
    description: `${hits} correct ${label.toLowerCase()}${hits === 1 ? "" : "s"}`,
  } satisfies ScoreReason;
}

function normalizeWinnerRecord(value?: Record<string, number | null | undefined>) {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([matchNo, winner]) => {
        const key = String(Number(matchNo));
        const winnerId = Number(winner);
        return Number.isInteger(Number(matchNo)) && Number.isFinite(winnerId) && winnerId > 0 ? [key, winnerId] : null;
      })
      .filter((entry): entry is [string, number] => Boolean(entry)),
  );
}

function knockoutReasonCode(matchNo: number) {
  if (matchNo >= 73 && matchNo <= 88) return "bracket_round_of_32_winner";
  if (matchNo >= 89 && matchNo <= 96) return "bracket_reached_quarter_final";
  if (matchNo >= 97 && matchNo <= 100) return "bracket_reached_semi_final";
  if (matchNo >= 101 && matchNo <= 102) return "bracket_finalist";
  if (matchNo === 103) return "bracket_third_place_winner";
  return "bracket_champion";
}

function scoreKnockoutByMatch(prediction: TournamentPathPrediction, result: TournamentPathResult) {
  const predictedWinners = normalizeWinnerRecord(prediction.winnersByMatch);
  const actualWinners = normalizeWinnerRecord(result.winnersByMatch);
  const reasons: ScoreReason[] = [];
  const details = [];

  for (const matchNo of KNOCKOUT_MATCH_NUMBERS) {
    const predictedWinner = predictedWinners[String(matchNo)];
    const actualWinner = actualWinners[String(matchNo)];
    if (!predictedWinner || !actualWinner || predictedWinner !== actualWinner) continue;

    const submittedAt = prediction.knockoutSavedAtByMatchNo?.[String(matchNo)] ?? prediction.predictedAt;
    const detail = informationAdjustedKnockoutPoints(matchNo, submittedAt, prediction.knockoutMatchKickoffByMatchNo);
    details.push(detail);
    if (detail.points <= 0) continue;

    const label = knockoutRoundLabel(detail.roundKey);
    const candidateText =
      detail.possibleCandidates === detail.originalCandidates
        ? "full blind value"
        : `${detail.possibleCandidates}/${detail.originalCandidates} candidates still unknown`;
    reasons.push({
      code: knockoutReasonCode(matchNo),
      points: detail.points,
      description: `${label} M${matchNo}: correct winner, ${candidateText}`,
    });
  }

  const perfectRoundOf32 =
    ROUND_OF_32_MATCH_NUMBERS.length > 0 &&
    ROUND_OF_32_MATCH_NUMBERS.every((matchNo) => {
      const predictedWinner = predictedWinners[String(matchNo)];
      const actualWinner = actualWinners[String(matchNo)];
      const submittedAt = prediction.knockoutSavedAtByMatchNo?.[String(matchNo)] ?? prediction.predictedAt;
      const detail = informationAdjustedKnockoutPoints(matchNo, submittedAt, prediction.knockoutMatchKickoffByMatchNo);
      return predictedWinner && actualWinner && predictedWinner === actualWinner && detail.points > 0;
    });

  if (perfectRoundOf32) {
    reasons.push({
      code: "bracket_perfect_round_of_32",
      points: PERFECT_ROUND_OF_32_BONUS_POINTS,
      description: "Perfect 16 out of 16 Round of 32 winners",
    });
  }

  return {
    reasons,
    details,
    total: reasons.reduce((sum, reason) => sum + reason.points, 0),
  };
}

export function applyBracketTiming(basePoints: number, timing: TimingResult) {
  return timing.eligible ? applyBasisPointMultiplier(basePoints, timing.multiplierBP) : 0;
}

export function calculateBracketSegmentPoints(input: {
  kind?: "top8";
  predictedTeamIds?: number[];
  actualTeamIds?: number[];
  basePoints?: number;
  submittedAt?: string | Date | null;
  top8PickSavedAtByTeamId?: Record<string, string | Date | null | undefined>;
  deadlineAt?: string | Date | null;
  lockAt?: string | Date | null;
}) {
  if (input.kind === "top8") {
    const predicted = Array.from(new Set(input.predictedTeamIds ?? []));
    const actual = new Set(input.actualTeamIds ?? []);
    const lockAt = input.lockAt ?? input.deadlineAt;
    const timing = resolveTop8PickPoints(input.submittedAt, lockAt);
    const pickDetails: Top8PickPointDetail[] = predicted.map((teamId) => {
      const savedAtValue = input.top8PickSavedAtByTeamId?.[String(teamId)] ?? input.submittedAt ?? null;
      const pickTiming = resolveTop8PickPoints(savedAtValue, lockAt);
      const correct = actual.has(teamId);
      return {
        teamId,
        correct,
        savedAt: savedAtValue instanceof Date ? savedAtValue.toISOString() : savedAtValue,
        points: correct && pickTiming.eligible ? pickTiming.pointsPerCorrectTeam : 0,
        pointsPerCorrectTeam: pickTiming.pointsPerCorrectTeam,
        timingBucket: pickTiming.bucket,
        eligible: pickTiming.eligible,
        hoursBeforeDeadline: pickTiming.hoursBeforeDeadline,
      };
    });
    const correctTeams = pickDetails.filter((pick) => pick.correct).length;
    const top8BasePoints = pickDetails.reduce((sum, pick) => sum + pick.points, 0);
    const perfectBonus = predicted.length === 8 && pickDetails.every((pick) => pick.correct && pick.eligible) ? TOP8_PERFECT_BONUS_POINTS : 0;
    return {
      total: top8BasePoints + perfectBonus,
      basePoints: top8BasePoints,
      timing,
      correctTeams,
      perfectBonus,
      pickDetails,
      reasons:
        top8BasePoints > 0
          ? [
              {
                code: "top8_correct_teams",
                points: top8BasePoints,
                description: `${correctTeams} correct third-place qualifier${correctTeams === 1 ? "" : "s"}`,
              },
              ...(perfectBonus > 0
                ? [
                    {
                      code: "top8_perfect",
                      points: perfectBonus,
                      description: "Perfect 8 out of 8 Top 8 bonus",
                    },
                  ]
                : []),
            ]
          : [],
    };
  }

  const timing = resolveBracketTiming(input.submittedAt, input.deadlineAt);
  const segmentBasePoints = input.basePoints ?? 0;
  return {
    total: applyBracketTiming(segmentBasePoints, timing),
    basePoints: timing.eligible ? segmentBasePoints : 0,
    timing,
  };
}

export function calculateBracketPoints(prediction: TournamentPathPrediction = {}, result: TournamentPathResult = {}) {
  const reasons: ScoreReason[] = [];
  const timing = resolveKnockoutTiming(prediction.predictedAt, prediction.knockoutLockAt ?? prediction.firstKickoffAt, prediction.knockoutOpenAt);

  if (!timing.eligible) {
    return {
      total: 0,
      basePoints: 0,
      timing,
      reasons: [{ code: timing.bucket, points: 0, description: "Tournament path segment is not eligible for points" }],
    };
  }

  const hasMatchLevelScoring = Object.keys(prediction.winnersByMatch ?? {}).length > 0 && Object.keys(result.winnersByMatch ?? {}).length > 0;
  if (hasMatchLevelScoring) {
    const score = scoreKnockoutByMatch(prediction, result);
    return {
      total: score.total,
      basePoints: score.total,
      timing,
      reasons: score.reasons,
      slotDetails: score.details,
    };
  }

  for (const round of roundPointValues) {
    const reason = scoreRound(prediction[round.key], result[round.key], round.points, round.code, round.label);
    if (reason) reasons.push(reason);
  }

  if (prediction.championTeamId && prediction.championTeamId === result.championTeamId) {
    reasons.push({ code: "bracket_champion", points: 60, description: "Correct tournament champion" });
  }

  if (prediction.thirdPlaceWinnerTeamId && prediction.thirdPlaceWinnerTeamId === result.thirdPlaceWinnerTeamId) {
    reasons.push({ code: "bracket_third_place_winner", points: 26, description: "Correct third-place match winner" });
  }

  const basePoints = reasons.reduce((sum, reason) => sum + reason.points, 0);

  return {
    total: applyBasisPointMultiplier(basePoints, timing.multiplierBP),
    basePoints,
    timing,
    reasons,
  };
}
