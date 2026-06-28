import { describe, expect, it } from "vitest";
import { buildPublicPredictionPreview, getPublicPredictionFocusIndex } from "../lib/privacy/publicPredictionPreview";
import { canRevealPrediction } from "../lib/utils/locks";

const baseTeam = { id: 1, name: "Canada", code: "CAN", country: "Canada", logoUrl: null };
const awayTeam = { id: 2, name: "Mexico", code: "MEX", country: "Mexico", logoUrl: null };

describe("public prediction visibility", () => {
  it("hides public match scores and saved timestamps before kickoff lock", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [{ match_id: 10, home_score: 2, away_score: 1, updated_at: "2026-06-10T14:00:00Z" }],
      new Date("2026-06-11T18:59:59Z"),
    );

    expect(preview).toEqual([
      {
        id: 10,
        homeTeam: baseTeam,
        awayTeam,
        homeScore: null,
        awayScore: null,
        savedAt: null,
        revealAt: "2026-06-11T19:00:00Z",
        revealed: false,
        status: "scheduled",
        matchLabel: "Fixture",
      },
    ]);
  });

  it("reveals public match scores exactly at kickoff lock", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [{ match_id: 10, home_score: 2, away_score: 1, updated_at: "2026-06-10T14:00:00Z" }],
      new Date("2026-06-11T19:00:00Z"),
    );

    expect(preview[0]).toMatchObject({
      homeScore: 2,
      awayScore: 1,
      savedAt: "2026-06-10T14:00:00Z",
      revealed: true,
    });
  });

  it("uses the meaningful pick timestamp for revealed public profiles", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [
        {
          match_id: 10,
          home_score: 2,
          away_score: 1,
          meaningful_updated_at: "2026-06-10T14:00:00Z",
          updated_at: "2026-06-11T12:00:00Z",
        },
      ],
      new Date("2026-06-11T19:00:00Z"),
    );

    expect(preview[0]).toMatchObject({
      savedAt: "2026-06-10T14:00:00Z",
      revealed: true,
    });
  });

  it("does not coerce missing stored scores into zeroes after reveal", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [{ match_id: 10, home_score: null, away_score: "", updated_at: "2026-06-10T14:00:00Z" }],
      new Date("2026-06-11T19:00:00Z"),
    );

    expect(preview[0]).toMatchObject({
      homeScore: null,
      awayScore: null,
      savedAt: "2026-06-10T14:00:00Z",
      revealed: true,
    });
  });

  it("does not reveal public scores when kickoff data is invalid", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "not-a-date",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [{ match_id: 10, home_score: 2, away_score: 1, updated_at: "2026-06-10T14:00:00Z" }],
      new Date("2026-06-11T19:00:00Z"),
    );

    expect(preview[0]).toMatchObject({
      homeScore: null,
      awayScore: null,
      savedAt: null,
      revealed: false,
    });
    expect(canRevealPrediction({ kickoff_at: "not-a-date" }, new Date("2026-06-11T19:00:00Z"))).toBe(false);
  });

  it("focuses the public profile timeline on the first live or upcoming match", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          status: "finished",
          homeTeam: baseTeam,
          awayTeam,
        },
        {
          id: 11,
          kickoffAt: "2026-06-12T19:00:00Z",
          status: "scheduled",
          homeTeam: baseTeam,
          awayTeam,
        },
        {
          id: 12,
          kickoffAt: "2026-06-13T19:00:00Z",
          status: "scheduled",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [],
      new Date("2026-06-12T12:00:00Z"),
    );

    expect(getPublicPredictionFocusIndex(preview, new Date("2026-06-12T12:00:00Z"))).toBe(1);
  });

  it("falls back to the latest revealed match when every public profile fixture is in the past", () => {
    const preview = buildPublicPredictionPreview(
      [
        {
          id: 10,
          kickoffAt: "2026-06-11T19:00:00Z",
          status: "finished",
          homeTeam: baseTeam,
          awayTeam,
        },
        {
          id: 11,
          kickoffAt: "2026-06-12T19:00:00Z",
          status: "finished",
          homeTeam: baseTeam,
          awayTeam,
        },
      ],
      [],
      new Date("2026-06-14T19:00:00Z"),
    );

    expect(getPublicPredictionFocusIndex(preview, new Date("2026-06-14T19:00:00Z"))).toBe(1);
  });
});
