export const DEFAULT_BRACKET_PICK_SOURCE_VERSION = "default_bracket_picks_v1";

export const GROUP_LETTERS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

export type DefaultPickSourceKind = "autosaved" | "random";

export type DefaultPickSource = {
  kind: DefaultPickSourceKind;
  label: "Autosaved" | "Random";
  reason: string;
  explanation: string;
  savedAt: string;
  generatedAt: string;
};

export type DefaultedBracketSegments = {
  version: typeof DEFAULT_BRACKET_PICK_SOURCE_VERSION;
  groups?: Record<string, DefaultPickSource>;
  top8?: {
    savedAt: string;
    picksByGroup: Record<string, DefaultPickSource>;
  };
};

export type DefaultTeamInput = {
  id: number;
  groupName: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function groupLetter(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.trim().toUpperCase().match(/[A-L]$/);
  return match?.[0] ?? "";
}

export function normalizeTeamIds(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((teamId) => Number.isFinite(teamId) && teamId > 0) : [];
}

export function parseDefaultedBracketSegments(path: unknown): DefaultedBracketSegments | null {
  if (!isRecord(path) || !isRecord(path.defaultedSegments)) return null;
  const segments = path.defaultedSegments;
  if (segments.version !== DEFAULT_BRACKET_PICK_SOURCE_VERSION) return null;

  return {
    version: DEFAULT_BRACKET_PICK_SOURCE_VERSION,
    groups: parseSourceRecord(segments.groups),
    top8: parseTop8Sources(segments.top8),
  };
}

function parseTop8Sources(value: unknown): DefaultedBracketSegments["top8"] | undefined {
  if (!isRecord(value) || typeof value.savedAt !== "string") return undefined;
  const picksByGroup = parseSourceRecord(value.picksByGroup);
  return Object.keys(picksByGroup).length > 0 ? { savedAt: value.savedAt, picksByGroup } : undefined;
}

function parseSourceRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => {
        const letter = groupLetter(key);
        const source = parseSource(item);
        return letter && source ? [letter, source] : null;
      })
      .filter((entry): entry is [string, DefaultPickSource] => Boolean(entry)),
  );
}

function parseSource(value: unknown): DefaultPickSource | null {
  if (!isRecord(value)) return null;
  const kind = value.kind === "autosaved" ? "autosaved" : value.kind === "random" ? "random" : null;
  if (!kind || typeof value.savedAt !== "string" || typeof value.generatedAt !== "string") return null;
  return {
    kind,
    label: kind === "autosaved" ? "Autosaved" : "Random",
    reason: typeof value.reason === "string" ? value.reason : kind,
    explanation: typeof value.explanation === "string" ? value.explanation : defaultExplanation(kind),
    savedAt: value.savedAt,
    generatedAt: value.generatedAt,
  };
}

function defaultExplanation(kind: DefaultPickSourceKind) {
  return kind === "autosaved"
    ? "This pick was recovered from the last server-side draft and scored at the worst eligible save time."
    : "This pick was generated because no saved pick existed and scored at the worst eligible save time.";
}

export function defaultPickSource(kind: DefaultPickSourceKind, reason: string, savedAt: string, generatedAt: string): DefaultPickSource {
  return {
    kind,
    label: kind === "autosaved" ? "Autosaved" : "Random",
    reason,
    explanation:
      kind === "autosaved"
        ? "This player had a server-side draft/partial pick but did not complete the final save. It was locked at the worst eligible timestamp."
        : "This player did not have a saved pick for this segment. A deterministic random default was generated and locked at the worst eligible timestamp.",
    savedAt,
    generatedAt,
  };
}

export function oneMillisecondBefore(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) throw new Error(`Invalid deadline: ${value}`);
  return new Date(time - 1).toISOString();
}

export function seededNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let state = seededNumber(seed) || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    state = Math.imul(state ^ (state >>> 13), 3266489909) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function teamsByGroupLetter(teams: DefaultTeamInput[]) {
  const groups = new Map<string, number[]>();
  for (const team of teams) {
    const letter = groupLetter(team.groupName);
    if (!GROUP_LETTERS.includes(letter)) continue;
    const rows = groups.get(letter) ?? [];
    rows.push(Number(team.id));
    groups.set(letter, rows);
  }
  return groups;
}

export function generateDefaultGroupRanking(userId: string, group: string, teamIds: number[]) {
  return seededShuffle(teamIds, `${DEFAULT_BRACKET_PICK_SOURCE_VERSION}:${userId}:group:${group}`).slice(0, 4);
}

export function normalizeRankingForGroup(value: unknown, validTeamIds: Set<number>) {
  const selected = normalizeTeamIds(value).filter((teamId) => validTeamIds.has(teamId));
  const unique = Array.from(new Set(selected));
  return unique.length >= 3 ? unique : [];
}

export function uniqueTop8ByGroup(teamIds: number[], teamGroupById: Map<number, string>) {
  const selected = new Map<string, number>();
  for (const teamId of teamIds) {
    const group = teamGroupById.get(Number(teamId));
    if (!group || selected.has(group)) continue;
    selected.set(group, Number(teamId));
  }
  return selected;
}

export function generateDefaultTop8TeamIds({
  userId,
  groupRankings,
  existingTeamIds,
  teamGroupById,
}: {
  userId: string;
  groupRankings: Record<string, number[]>;
  existingTeamIds?: number[];
  teamGroupById: Map<number, string>;
}) {
  const selectedByGroup = uniqueTop8ByGroup(existingTeamIds ?? [], teamGroupById);
  const groupOrder = seededShuffle(GROUP_LETTERS, `${DEFAULT_BRACKET_PICK_SOURCE_VERSION}:${userId}:top8-groups`);

  for (const group of groupOrder) {
    if (selectedByGroup.size >= 8 || selectedByGroup.has(group)) continue;
    const thirdPlaceTeamId = groupRankings[group]?.[2];
    if (thirdPlaceTeamId && !Array.from(selectedByGroup.values()).includes(thirdPlaceTeamId)) {
      selectedByGroup.set(group, thirdPlaceTeamId);
    }
  }

  return Array.from(selectedByGroup.entries())
    .slice(0, 8)
    .map(([, teamId]) => teamId);
}
