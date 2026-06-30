import { describe, expect, it } from "vitest";
import { resolveKnockoutWinnerTeamId } from "../lib/bracket/tournamentPathRules";

describe("resolveKnockoutWinnerTeamId", () => {
  it("uses penalty scores when a finished knockout match is tied after regulation", () => {
    expect(
      resolveKnockoutWinnerTeamId({
        status: "finished",
        homeTeam: { id: 11 },
        awayTeam: { id: 2380 },
        homeScore: 1,
        awayScore: 1,
        penaltyHomeScore: 3,
        penaltyAwayScore: 4,
      }),
    ).toBe(2380);

    expect(
      resolveKnockoutWinnerTeamId({
        status: "finished",
        home_team_id: 1118,
        away_team_id: 31,
        home_score: 1,
        away_score: 1,
        penalty_home_score: 2,
        penalty_away_score: 3,
      }),
    ).toBe(31);
  });

  it("does not return a winner before the match is finished", () => {
    expect(
      resolveKnockoutWinnerTeamId({
        status: "live",
        homeTeam: { id: 6 },
        awayTeam: { id: 12 },
        homeScore: 2,
        awayScore: 1,
      }),
    ).toBeNull();
  });
});
