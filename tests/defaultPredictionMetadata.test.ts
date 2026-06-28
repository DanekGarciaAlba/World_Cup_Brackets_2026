import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRACKET_PICK_SOURCE_VERSION,
  defaultPickSource,
  generateDefaultGroupRanking,
  generateDefaultTop8TeamIds,
  oneMillisecondBefore,
  parseDefaultedBracketSegments,
} from "@/lib/bracket/defaultPredictionMetadata";

describe("default bracket prediction metadata", () => {
  it("generates stable deterministic group defaults per user", () => {
    const teams = [1, 2, 3, 4];
    const first = generateDefaultGroupRanking("user-a", "A", teams);
    const second = generateDefaultGroupRanking("user-a", "A", teams);
    const otherUser = generateDefaultGroupRanking("user-b", "A", teams);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(new Set(first).size).toBe(4);
    expect(otherUser).toHaveLength(4);
  });

  it("fills Top 8 from predicted third-place teams while preserving existing groups", () => {
    const groupRankings = Object.fromEntries(
      "ABCDEFGHIJKL".split("").map((letter, index) => [letter, [index * 4 + 1, index * 4 + 2, index * 4 + 3, index * 4 + 4]]),
    );
    const teamGroupById = new Map<number, string>();
    for (const [letter, ranking] of Object.entries(groupRankings)) {
      for (const teamId of ranking) teamGroupById.set(teamId, letter);
    }

    const top8 = generateDefaultTop8TeamIds({
      userId: "user-a",
      groupRankings,
      existingTeamIds: [3],
      teamGroupById,
    });

    expect(top8).toHaveLength(8);
    expect(top8).toContain(3);
    expect(new Set(top8).size).toBe(8);
    expect(top8.every((teamId) => groupRankings[teamGroupById.get(teamId) ?? ""]?.[2] === teamId)).toBe(true);
  });

  it("parses only recognized default metadata", () => {
    const savedAt = oneMillisecondBefore("2026-06-24T19:00:00.000Z");
    const generatedAt = "2026-06-28T12:00:00.000Z";
    const segments = parseDefaultedBracketSegments({
      defaultedSegments: {
        version: DEFAULT_BRACKET_PICK_SOURCE_VERSION,
        groups: {
          A: defaultPickSource("random", "no_saved_group_prediction", savedAt, generatedAt),
        },
      },
    });

    expect(segments?.groups?.A?.label).toBe("Random");
    expect(parseDefaultedBracketSegments({ defaultedSegments: { version: "old" } })).toBeNull();
  });
});
