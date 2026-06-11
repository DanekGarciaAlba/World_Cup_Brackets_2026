import { describe, expect, it } from "vitest";
import { filterUnacknowledgedMatchScores, matchScoreAcknowledgementKey } from "../lib/scoring/recentMatchScores";

const baseScore = {
  matchId: 101,
  matchLabel: "Group A",
  kickoffAt: "2026-06-11T19:00:00Z",
  homeTeamName: "Mexico",
  awayTeamName: "South Africa",
  predictedScoreLabel: "2-1",
  actualScoreLabel: "2-0",
  points: 8,
  exactScore: false,
  correctOutcome: true,
  timingMultiplier: 1.2,
  scoredAt: "2026-06-11T21:00:00Z",
};

describe("recent match score acknowledgements", () => {
  it("keys acknowledged score popups by match, result, and points", () => {
    expect(matchScoreAcknowledgementKey(baseScore)).toBe("101:2-0:8");
  });

  it("does not re-show an old scored match after recalculation when the match result and points are unchanged", () => {
    const acknowledged = new Set([matchScoreAcknowledgementKey(baseScore)]);

    expect(
      filterUnacknowledgedMatchScores(
        [
          {
            ...baseScore,
            scoredAt: "2026-06-11T21:30:00Z",
          },
        ],
        acknowledged,
      ),
    ).toEqual([]);
  });

  it("shows only newly scored matches after previous ones have been acknowledged", () => {
    const nextScore = {
      ...baseScore,
      matchId: 102,
      actualScoreLabel: "1-1",
      points: 5,
    };

    const acknowledged = new Set([matchScoreAcknowledgementKey(baseScore)]);

    expect(filterUnacknowledgedMatchScores([baseScore, nextScore], acknowledged)).toEqual([nextScore]);
  });
});
