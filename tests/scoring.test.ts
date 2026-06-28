import { describe, expect, it } from "vitest";
import { calculateBracketPoints } from "../lib/scoring/calculateBracketPoints";
import { calculateBracketSegmentPoints } from "../lib/scoring/calculateBracketPoints";
import { calculateGroupPredictionPoints } from "../lib/scoring/calculateGroupPredictionPoints";
import { calculateMatchPoints } from "../lib/scoring/calculateMatchPoints";
import { resolveThirdPlaceSlotGroups } from "../lib/data/worldCupThirdPlaceRules";
import { pruneInvalidWinnersByMatch } from "../lib/bracket/tournamentPathRules";
import { isMatchLocked } from "../lib/utils/locks";
import { deriveWorldCupDeadlines } from "../lib/scoring/deadlines";

describe("match scoring", () => {
  it("scores an exact group-stage score 7+ days early as 18", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-06-01T12:00:00Z",
        kickoffAt: "2026-06-10T12:00:00Z",
        stage: "group",
      },
      { homeScore: 2, awayScore: 1 },
    );
    expect(score.total).toBe(18);
    expect(score.basePoints).toBe(14);
    expect(score.timing.bucket).toBe("7d_plus");
    expect(score.timing.multiplierBP).toBe(135);
    expect(score.stage.multiplierBP).toBe(100);
  });

  it("scores an exact final score 48+ hours early as 23", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-07-10T12:00:00Z",
        kickoffAt: "2026-07-19T12:00:00Z",
        stage: "final",
      },
      { homeScore: 2, awayScore: 1 },
    );
    expect(score.total).toBe(23);
    expect(score.basePoints).toBe(14);
    expect(score.timing.bucket).toBe("48h_plus");
    expect(score.timing.multiplierBP).toBe(135);
    expect(score.stage.multiplierBP).toBe(125);
  });

  it("uses the compressed knockout fixture timing buckets from Round of 32 onward", () => {
    const roundOf32 = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAdvancerTeamId: 10,
        predictedAt: "2026-06-29T13:00:00Z",
        kickoffAt: "2026-07-01T12:00:00Z",
        stage: "Round of 32",
      },
      { homeScore: 2, awayScore: 1, winnerTeamId: 10 },
    );

    const finalLate = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-07-18T00:30:00Z",
        kickoffAt: "2026-07-19T12:00:00Z",
        stage: "final",
      },
      { homeScore: 2, awayScore: 1 },
    );

    expect(roundOf32.timing.bucket).toBe("24h_to_48h");
    expect(roundOf32.timing.multiplierBP).toBe(120);
    expect(roundOf32.total).toBe(18);
    expect(finalLate.timing.bucket).toBe("24h_to_48h");
    expect(finalLate.timing.multiplierBP).toBe(120);
    expect(finalLate.total).toBe(21);
  });

  it("scores an exact result deterministically without timing data", () => {
    const score = calculateMatchPoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 });
    expect(score.total).toBe(14);
    expect(score.reasons.map((reason) => reason.code)).toEqual([
      "correct_outcome",
      "exact_score",
      "goal_difference",
      "home_goals",
      "away_goals",
    ]);
  });

  it("scores a wrong outcome as zero", () => {
    const score = calculateMatchPoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 });
    expect(score.total).toBe(0);
    expect(score.reasons.map((reason) => reason.code)).toContain("wrong_outcome");
  });

  it("ignores stale advancer fields for group-stage matches", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 1,
        awayScore: 1,
        predictedAdvancerTeamId: 17,
        predictedAt: "2026-06-11T22:09:28.533Z",
        kickoffAt: "2026-06-12T02:00:00Z",
        stage: "Group Stage",
      },
      {
        homeScore: 2,
        awayScore: 1,
        winnerTeamId: 17,
      },
    );

    expect(score.total).toBe(0);
    expect(score.reasons.map((reason) => reason.code)).toEqual(["wrong_outcome"]);
  });

  it("scores the same exact daily result at the 0.60x timing bucket", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-06-10T11:45:00Z",
        kickoffAt: "2026-06-10T12:00:00Z",
      },
      { homeScore: 2, awayScore: 1 },
    );
    expect(score.total).toBe(8);
    expect(score.timing.bucket).toBe("0_to_30m");
    expect(score.timing.multiplierBP).toBe(60);
  });

  it("scores after-kickoff daily picks as zero", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-06-10T12:01:00Z",
        kickoffAt: "2026-06-10T12:00:00Z",
      },
      { homeScore: 2, awayScore: 1 },
    );
    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
  });

  it("scores exact-kickoff daily picks as zero", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 2,
        awayScore: 1,
        predictedAt: "2026-06-10T12:00:00Z",
        kickoffAt: "2026-06-10T12:00:00Z",
      },
      { homeScore: 2, awayScore: 1 },
    );

    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
  });

  it("supports a tied knockout score plus selected advancing team", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 1,
        awayScore: 1,
        predictedAdvancerTeamId: 10,
        predictedAt: "2026-07-01T12:00:00Z",
        kickoffAt: "2026-07-08T12:00:00Z",
        stage: "round_of_16",
      },
      {
        homeScore: 1,
        awayScore: 1,
        winnerTeamId: 10,
        penaltyWinnerTeamId: 10,
      },
    );

    expect(score.basePoints).toBe(14);
    expect(score.total).toBe(20);
    expect(score.reasons.map((reason) => reason.code)).toContain("correct_advancer");
  });

  it("does not award score-detail bonuses on a wrong advancer", () => {
    const score = calculateMatchPoints(
      {
        homeScore: 1,
        awayScore: 1,
        predictedAdvancerTeamId: 10,
        predictedAt: "2026-07-01T12:00:00Z",
        kickoffAt: "2026-07-08T12:00:00Z",
        stage: "round_of_16",
      },
      {
        homeScore: 1,
        awayScore: 1,
        winnerTeamId: 11,
        penaltyWinnerTeamId: 11,
      },
    );

    expect(score.total).toBe(0);
    expect(score.reasons.map((reason) => reason.code)).toEqual(["wrong_advancer"]);
  });
});

describe("prediction locks", () => {
  it("locks at kickoff", () => {
    expect(isMatchLocked({ kickoff_at: "2026-06-01T12:00:00Z" }, new Date("2026-06-01T12:00:00Z"))).toBe(true);
  });

  it("locks after kickoff", () => {
    expect(isMatchLocked({ kickoff_at: "2026-06-01T12:00:00Z" }, new Date("2026-06-01T12:00:01Z"))).toBe(true);
  });

  it("allows edits before kickoff", () => {
    expect(isMatchLocked({ kickoff_at: "2026-06-01T12:00:00Z" }, new Date("2026-06-01T11:59:59Z"))).toBe(false);
  });

  it("locks invalid kickoff data", () => {
    expect(isMatchLocked({ kickoff_at: "not-a-date" }, new Date("2026-06-01T11:59:59Z"))).toBe(true);
  });
});

describe("group scoring", () => {
  it("scores exact group order before first group kickoff as 6/4/3", () => {
    const score = calculateGroupPredictionPoints({
      predictedTeamIds: [1, 2, 3, 4],
      actualTeamIds: [1, 2, 3, 4],
      predictedAt: "2026-06-01T12:00:00Z",
      groupCutoffAt: "2026-06-18T14:00:00Z",
      firstRoundKickoffA: "2026-06-11T19:00:00Z",
      firstRoundKickoffB: "2026-06-11T22:00:00Z",
    });

    expect(score.total).toBe(13);
    expect(score.reasons.map((reason) => reason.code)).toEqual([
      "group_first_exact",
      "group_second_exact",
      "group_third_exact",
    ]);
    expect(score.pointValues).toEqual({ first: 6, second: 4, third: 3 });
  });

  it("scores exact group order after one first-round match starts as 4/3/2", () => {
    const score = calculateGroupPredictionPoints({
      predictedTeamIds: [1, 2, 3, 4],
      actualTeamIds: [1, 2, 3, 4],
      predictedAt: "2026-06-11T20:00:00Z",
      groupCutoffAt: "2026-06-18T14:00:00Z",
      firstRoundKickoffA: "2026-06-11T19:00:00Z",
      firstRoundKickoffB: "2026-06-11T22:00:00Z",
    });

    expect(score.total).toBe(9);
    expect(score.pointValues).toEqual({ first: 4, second: 3, third: 2 });
  });

  it("scores exact group order after both first-round matches start as 3/2/1", () => {
    const score = calculateGroupPredictionPoints({
      predictedTeamIds: [1, 2, 3, 4],
      actualTeamIds: [1, 2, 3, 4],
      predictedAt: "2026-06-12T00:00:00Z",
      groupCutoffAt: "2026-06-18T14:00:00Z",
      firstRoundKickoffA: "2026-06-11T19:00:00Z",
      firstRoundKickoffB: "2026-06-11T22:00:00Z",
    });

    expect(score.total).toBe(6);
    expect(score.pointValues).toEqual({ first: 3, second: 2, third: 1 });
  });

  it("rejects group scoring at the global cutoff", () => {
    const score = calculateGroupPredictionPoints({
      predictedTeamIds: [1, 2, 3, 4],
      actualTeamIds: [1, 2, 3, 4],
      predictedAt: "2026-06-18T14:00:00Z",
      groupCutoffAt: "2026-06-18T14:00:00Z",
      firstRoundKickoffA: "2026-06-11T19:00:00Z",
      firstRoundKickoffB: "2026-06-11T22:00:00Z",
    });

    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
  });
});

describe("tournament path scoring", () => {
  it("opens knockout picks after the final group match buffer", () => {
    const deadlines = deriveWorldCupDeadlines([
      { kickoff_at: "2026-06-11T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 2 },
      { kickoff_at: "2026-06-12T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 3 },
      { kickoff_at: "2026-06-24T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 4 },
      { kickoff_at: "2026-06-27T21:00:00Z", group_name: "Group L", home_team_id: 47, away_team_id: 48 },
      { kickoff_at: "2026-06-28T19:00:00Z", round: "Round of 32", stage: "knockout" },
      { kickoff_at: "2026-07-04T01:30:00Z", round: "Round of 32", stage: "knockout" },
    ]);

    expect(deadlines.knockoutOpenAt).toBe("2026-06-28T00:00:00.000Z");
    expect(deadlines.knockoutLockAt).toBe("2026-07-04T01:30:00.000Z");
  });

  it("scores legacy knockout progression without an early timing multiplier", () => {
    const score = calculateBracketPoints(
      {
        roundOf16TeamIds: [1, 2],
        quarterFinalistTeamIds: [1, 2],
        semiFinalistTeamIds: [1],
        finalistTeamIds: [1, 9],
        championTeamId: 1,
        predictedAt: "2026-06-01T12:00:00Z",
        knockoutLockAt: "2026-06-28T19:00:00Z",
      },
      {
        roundOf16TeamIds: [1, 7],
        quarterFinalistTeamIds: [1, 8],
        semiFinalistTeamIds: [1, 10],
        finalistTeamIds: [1, 11],
        championTeamId: 1,
      },
    );

    expect(score.total).toBe(111);
    expect(score.reasons.map((reason) => reason.code)).toEqual([
      "bracket_reached_round_of_16",
      "bracket_reached_quarter_final",
      "bracket_reached_semi_final",
      "bracket_finalist",
      "bracket_champion",
    ]);
    expect(score.timing.multiplierBP).toBe(100);
  });

  it("scores a perfect blind knockout bracket as 350 points", () => {
    const matchNos = Array.from({ length: 32 }, (_, index) => 73 + index);
    const winnersByMatch = Object.fromEntries(matchNos.map((matchNo) => [String(matchNo), 1000 + matchNo]));
    const savedAtByMatchNo = Object.fromEntries(matchNos.map((matchNo) => [String(matchNo), "2026-06-28T00:05:00Z"]));
    const kickoffByMatchNo = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => {
        const matchNo = 73 + index;
        return [String(matchNo), new Date(Date.parse("2026-06-28T19:00:00Z") + index * 6 * 36e5).toISOString()];
      }),
    );

    const score = calculateBracketPoints(
      {
        winnersByMatch,
        knockoutSavedAtByMatchNo: savedAtByMatchNo,
        knockoutMatchKickoffByMatchNo: kickoffByMatchNo,
        predictedAt: "2026-06-28T00:05:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-07-04T01:30:00Z",
      },
      { winnersByMatch },
    );

    expect(score.total).toBe(350);
    expect(score.reasons.map((reason) => reason.code)).toContain("bracket_perfect_round_of_32");
    expect(score.reasons.find((reason) => reason.code === "bracket_champion")?.points).toBe(60);
  });

  it("reduces only the affected branch when Round of 32 feeder results become known", () => {
    const kickoffByMatchNo = {
      "73": "2026-06-28T19:00:00Z",
      "75": "2026-06-29T19:00:00Z",
      "80": "2026-07-01T19:00:00Z",
      "89": "2026-07-05T19:00:00Z",
    };
    const oneFeederKnown = calculateBracketPoints(
      {
        winnersByMatch: { "89": 500 },
        knockoutSavedAtByMatchNo: { "89": "2026-06-28T20:00:00Z" },
        knockoutMatchKickoffByMatchNo: kickoffByMatchNo,
        predictedAt: "2026-06-28T00:05:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-07-04T01:30:00Z",
      },
      { winnersByMatch: { "89": 500 } },
    );

    const bothFeedersKnown = calculateBracketPoints(
      {
        winnersByMatch: { "89": 500 },
        knockoutSavedAtByMatchNo: { "89": "2026-06-29T20:00:00Z" },
        knockoutMatchKickoffByMatchNo: kickoffByMatchNo,
        predictedAt: "2026-06-28T00:05:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-07-04T01:30:00Z",
      },
      { winnersByMatch: { "89": 500 } },
    );

    const unrelatedFutureR32 = calculateBracketPoints(
      {
        winnersByMatch: { "80": 800 },
        knockoutSavedAtByMatchNo: { "80": "2026-06-28T20:00:00Z" },
        knockoutMatchKickoffByMatchNo: kickoffByMatchNo,
        predictedAt: "2026-06-28T00:05:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-07-04T01:30:00Z",
      },
      { winnersByMatch: { "80": 800 } },
    );

    expect(oneFeederKnown.total).toBe(6);
    expect(bothFeedersKnown.total).toBe(4);
    expect(unrelatedFutureR32.total).toBe(4);
  });

  it("scores an R32 pick as zero once that exact match has kicked off", () => {
    const score = calculateBracketPoints(
      {
        winnersByMatch: { "73": 101 },
        knockoutSavedAtByMatchNo: { "73": "2026-06-28T19:00:00Z" },
        knockoutMatchKickoffByMatchNo: { "73": "2026-06-28T19:00:00Z" },
        predictedAt: "2026-06-28T00:05:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-07-04T01:30:00Z",
      },
      { winnersByMatch: { "73": 101 } },
    );

    expect(score.total).toBe(0);
    expect(score.reasons).toEqual([]);
  });

  it("does not score knockout picks saved before the official Round of 32 window", () => {
    const score = calculateBracketPoints(
      {
        roundOf16TeamIds: [1],
        championTeamId: 1,
        predictedAt: "2026-06-27T23:59:00Z",
        knockoutOpenAt: "2026-06-28T00:00:00Z",
        knockoutLockAt: "2026-06-28T19:00:00Z",
      },
      {
        roundOf16TeamIds: [1],
        championTeamId: 1,
      },
    );

    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
    expect(score.timing.bucket).toBe("before_window");
  });

  it("scores top-eight third-place picks with the Jun 20 fixed window and perfect bonus", () => {
    const score = calculateBracketSegmentPoints({
      kind: "top8",
      predictedTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      actualTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      submittedAt: "2026-06-20T14:00:00Z",
      lockAt: "2026-06-24T19:00:00Z",
    });

    expect(score.basePoints).toBe(64);
    expect(score.perfectBonus).toBe(10);
    expect(score.total).toBe(74);
    expect(score.pickDetails?.every((pick) => pick.pointsPerCorrectTeam === 8)).toBe(true);
    expect(score.timing.multiplierBP).toBe(100);
  });

  it("scores late Jun 23 top-eight picks at +4 each before lock", () => {
    const score = calculateBracketSegmentPoints({
      kind: "top8",
      predictedTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      actualTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      submittedAt: "2026-06-23T20:00:00Z",
      lockAt: "2026-06-24T19:00:00Z",
    });

    expect(score.basePoints).toBe(32);
    expect(score.perfectBonus).toBe(10);
    expect(score.total).toBe(42);
    expect(score.pickDetails?.every((pick) => pick.pointsPerCorrectTeam === 4)).toBe(true);
    expect(score.timing.multiplierBP).toBe(100);
  });

  it("scores top-eight third-place picks at +9 each when the window opens", () => {
    const score = calculateBracketSegmentPoints({
      kind: "top8",
      predictedTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      actualTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      submittedAt: "2026-06-18T14:00:00Z",
      lockAt: "2026-06-24T19:00:00Z",
    });

    expect(score.basePoints).toBe(72);
    expect(score.perfectBonus).toBe(10);
    expect(score.total).toBe(82);
    expect(score.pickDetails?.every((pick) => pick.pointsPerCorrectTeam === 9)).toBe(true);
    expect(score.timing.multiplierBP).toBe(100);
  });

  it("scores each top-eight team from that team's own saved timestamp", () => {
    const score = calculateBracketSegmentPoints({
      kind: "top8",
      predictedTeamIds: [1, 2, 3, 4],
      actualTeamIds: [1, 2, 3],
      submittedAt: "2026-06-24T13:00:00Z",
      top8PickSavedAtByTeamId: {
        "1": "2026-06-18T14:00:00Z",
        "2": "2026-06-20T14:00:00Z",
        "3": "2026-06-24T13:00:00Z",
        "4": "2026-06-22T14:00:00Z",
      },
      lockAt: "2026-06-24T19:00:00Z",
    });

    expect(score.correctTeams).toBe(3);
    expect(score.basePoints).toBe(20);
    expect(score.perfectBonus).toBe(0);
    expect(score.total).toBe(20);
    expect(score.pickDetails?.map((pick) => pick.points)).toEqual([9, 8, 3, 0]);
  });

  it("scores top-eight third-place picks as zero at the global lock", () => {
    const score = calculateBracketSegmentPoints({
      kind: "top8",
      predictedTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      actualTeamIds: [1, 2, 3, 4, 5, 6, 7, 8],
      submittedAt: "2026-06-24T19:00:00Z",
      lockAt: "2026-06-24T19:00:00Z",
    });

    expect(score.basePoints).toBe(0);
    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
  });

  it("keeps the global top-eight lock at Jun 24, 3 PM ET", () => {
    const deadlines = deriveWorldCupDeadlines([
      { kickoff_at: "2026-06-11T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 2 },
      { kickoff_at: "2026-06-20T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 3 },
      { kickoff_at: "2026-06-25T19:00:00Z", group_name: "Group A", home_team_id: 1, away_team_id: 4 },
    ]);

    expect(deadlines.top8LockAt).toBe("2026-06-24T19:00:00.000Z");
  });

  it("scores started bracket segments as zero", () => {
    const started = calculateBracketSegmentPoints({
      basePoints: 8,
      submittedAt: "2026-06-10T12:01:00Z",
      deadlineAt: "2026-06-10T12:00:00Z",
    });

    expect(started.total).toBe(0);
    expect(started.timing.eligible).toBe(false);
  });

  it("scores exact-deadline bracket segments as zero", () => {
    const score = calculateBracketSegmentPoints({
      basePoints: 8,
      submittedAt: "2026-06-10T12:00:00Z",
      deadlineAt: "2026-06-10T12:00:00Z",
    });

    expect(score.total).toBe(0);
    expect(score.timing.eligible).toBe(false);
  });
});

describe("third-place bracket mapping", () => {
  it("maps selected third-place groups through the FIFA slot order", () => {
    expect(resolveThirdPlaceSlotGroups(["E", "F", "G", "H", "I", "J", "K", "L"])).toEqual({
      "74": "F",
      "77": "G",
      "79": "E",
      "80": "K",
      "81": "I",
      "82": "H",
      "85": "J",
      "87": "L",
    });

    expect(resolveThirdPlaceSlotGroups(["H", "G", "F", "E", "D", "C", "B", "A"])).toEqual({
      "74": "C",
      "77": "F",
      "79": "H",
      "80": "E",
      "81": "B",
      "82": "A",
      "85": "G",
      "87": "D",
    });
  });
});

describe("tournament path winner pruning", () => {
  it("removes stale downstream winners when match participants change", () => {
    const winners = pruneInvalidWinnersByMatch(
      {
        "73": 1,
        "89": 3,
        "999": 5,
      },
      [
        { matchNo: 73, teams: [1, 2] },
        { matchNo: 89, teams: [null, 4] },
      ],
    );

    expect(winners).toEqual({ "73": 1 });
  });

  it("clears the third-place pick when semi-final loser slots change", () => {
    const winners = pruneInvalidWinnersByMatch({ "103": 7 }, [{ matchNo: 103, teams: [8, 9] }]);

    expect(winners).toEqual({});
  });
});
