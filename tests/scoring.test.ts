import { describe, expect, it } from "vitest";
import { calculateMatchPoints } from "../lib/scoring/calculateMatchPoints";
import { isMatchLocked } from "../lib/utils/locks";

describe("match scoring", () => {
  it("scores an exact result deterministically", () => {
    const score = calculateMatchPoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 });
    expect(score.total).toBe(7);
    expect(score.reasons.map((reason) => reason.code)).toEqual([
      "correct_outcome",
      "exact_score",
      "goal_difference",
      "team_goals",
    ]);
  });

  it("scores a wrong prediction as zero", () => {
    const score = calculateMatchPoints({ homeScore: 0, awayScore: 2 }, { homeScore: 2, awayScore: 0 });
    expect(score.total).toBe(0);
  });
});

describe("prediction locks", () => {
  it("locks after kickoff", () => {
    expect(isMatchLocked({ kickoff_at: "2026-06-01T12:00:00Z" }, new Date("2026-06-01T12:00:01Z"))).toBe(true);
  });

  it("allows edits before kickoff", () => {
    expect(isMatchLocked({ kickoff_at: "2026-06-01T12:00:00Z" }, new Date("2026-06-01T11:59:59Z"))).toBe(false);
  });
});
