"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import confetti from "canvas-confetti";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Info,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BracketPointsGuideDialog } from "@/components/scoring/PointsSystemDialog";
import type { DefaultPickSource } from "@/lib/bracket/defaultPredictionMetadata";
import { pruneInvalidWinnersByMatch } from "@/lib/bracket/tournamentPathRules";
import { getWorldCupTeamFlagPath } from "@/lib/data/worldCupTeams";
import { resolveThirdPlaceSlotGroups } from "@/lib/data/worldCupThirdPlaceRules";
import { resolveTop8PickPoints, TOP8_PERFECT_BONUS_POINTS } from "@/lib/scoring/timing";
import { formatEasternCompactDateTime, formatEasternDateTime } from "@/lib/utils/easternTime";
import { cn } from "@/lib/utils";

export type PredictorTeam = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  groupName: string | null;
  logoUrl: string | null;
};

export type PredictorGroup = {
  groupName: string;
  teams: PredictorTeam[];
};

export type SavedTournamentPath = {
  roundOf32: number[];
  roundOf16: number[];
  quarterFinalists: number[];
  semiFinalists: number[];
  finalists: number[];
  champion: number | null;
  thirdPlaceWinner: number | null;
  groupRankings: Record<string, number[]>;
  thirdPlaceGroups: string[];
  top8TeamIds: number[];
  top8GroupSavedAtByLetter?: Record<string, string | null>;
  thirdPlaceSlotTeamIds: Record<string, number | null>;
  winnersByMatch: Record<string, number | null>;
  knockoutSavedAtByMatchNo?: Record<string, string | null>;
};

type Slot =
  | { kind: "rank"; group: string; rank: 1 | 2; label: string }
  | { kind: "third"; matchNo: number; allowed: string[]; label: string };

type BracketMatch = {
  matchNo: number;
  roundKey: "roundOf32" | "roundOf16" | "quarterFinals" | "semiFinals" | "thirdPlace" | "final";
  title: string;
  teams: [PredictorTeam | null, PredictorTeam | null];
  slotLabels: [string, string];
};

type Round = {
  key: BracketMatch["roundKey"];
  label: string;
  matches: BracketMatch[];
};

type GroupPointWindow = {
  first: number;
  second: number;
  third: number;
  dropAt?: string[];
};

type KnockoutMatchLock = {
  kickoffAt: string | null;
  locked: boolean;
};

type BracketAuditReason = {
  code?: string;
  description?: string;
  points?: number | string;
};

type BracketGroupAudit = {
  released: boolean;
  points: number | null;
  actualTeamIds: number[];
  pointValues: { first?: number; second?: number; third?: number } | null;
  reasons: BracketAuditReason[];
  scoredAt: string | null;
  source?: DefaultPickSource | null;
};

type BracketTop8Audit = {
  released: boolean;
  points: number | null;
  basePoints: number | null;
  timingMultiplier: number | null;
  correctTeams: number | null;
  perfectBonus: number | null;
  pickDetails: Array<{
    teamId: number;
    correct: boolean | null;
    savedAt: string | null;
    points: number;
    pointsPerCorrectTeam: number;
    timingBucket: string | null;
    eligible: boolean | null;
  }>;
  actualTeamIds: number[];
  reasons: BracketAuditReason[];
  scoredAt: string | null;
  sourcesByGroup?: Record<string, DefaultPickSource>;
};

export type OwnBracketAudit = {
  groups: Record<string, BracketGroupAudit>;
  top8: BracketTop8Audit;
};

type BracketPredictorProps = {
  groups: PredictorGroup[];
  signedIn: boolean;
  firstKickoffAt: string | null;
  deadlines: {
    tournamentStartAt: string;
    groupCutoffAt: string;
    top8OpenAt: string;
    top8LockAt: string;
    knockoutOpenAt: string;
    knockoutLockAt: string;
  };
  groupPointValues: Record<string, GroupPointWindow>;
  initialPath: SavedTournamentPath | null;
  savedAt: string | null;
  top8SavedAt: string | null;
  initialGroupSavedAtByLetter?: Record<string, string | null>;
  audit?: OwnBracketAudit | null;
  knockoutMatchLocksByNo?: Record<string, KnockoutMatchLock>;
  actualKnockoutWinnersByNo?: Record<string, number | null>;
};

type BuilderStep = "groups" | "thirds" | "bracket" | "summary";

const GROUP_LETTERS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

const ROUND_OF_32: Array<{ matchNo: number; slots: [Slot, Slot] }> = [
  { matchNo: 73, slots: [rankSlot("A", 2), rankSlot("B", 2)] },
  { matchNo: 74, slots: [rankSlot("E", 1), thirdSlot(74, "A/B/C/D/F")] },
  { matchNo: 75, slots: [rankSlot("F", 1), rankSlot("C", 2)] },
  { matchNo: 76, slots: [rankSlot("C", 1), rankSlot("F", 2)] },
  { matchNo: 77, slots: [rankSlot("I", 1), thirdSlot(77, "C/D/F/G/H")] },
  { matchNo: 78, slots: [rankSlot("E", 2), rankSlot("I", 2)] },
  { matchNo: 79, slots: [rankSlot("A", 1), thirdSlot(79, "C/E/F/H/I")] },
  { matchNo: 80, slots: [rankSlot("L", 1), thirdSlot(80, "E/H/I/J/K")] },
  { matchNo: 81, slots: [rankSlot("D", 1), thirdSlot(81, "B/E/F/I/J")] },
  { matchNo: 82, slots: [rankSlot("G", 1), thirdSlot(82, "A/E/H/I/J")] },
  { matchNo: 83, slots: [rankSlot("K", 2), rankSlot("L", 2)] },
  { matchNo: 84, slots: [rankSlot("H", 1), rankSlot("J", 2)] },
  { matchNo: 85, slots: [rankSlot("B", 1), thirdSlot(85, "E/F/G/I/J")] },
  { matchNo: 86, slots: [rankSlot("J", 1), rankSlot("H", 2)] },
  { matchNo: 87, slots: [rankSlot("K", 1), thirdSlot(87, "D/E/I/J/L")] },
  { matchNo: 88, slots: [rankSlot("D", 2), rankSlot("G", 2)] },
];

const ADVANCEMENT_MATCHES = [
  { matchNo: 89, from: [73, 75], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 90, from: [74, 77], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 91, from: [76, 78], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 92, from: [79, 80], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 93, from: [83, 84], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 94, from: [81, 82], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 95, from: [86, 88], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 96, from: [85, 87], roundKey: "roundOf16", title: "Round of 16" },
  { matchNo: 97, from: [89, 90], roundKey: "quarterFinals", title: "Quarter-final" },
  { matchNo: 98, from: [93, 94], roundKey: "quarterFinals", title: "Quarter-final" },
  { matchNo: 99, from: [91, 92], roundKey: "quarterFinals", title: "Quarter-final" },
  { matchNo: 100, from: [95, 96], roundKey: "quarterFinals", title: "Quarter-final" },
  { matchNo: 101, from: [97, 98], roundKey: "semiFinals", title: "Semi-final" },
  { matchNo: 102, from: [99, 100], roundKey: "semiFinals", title: "Semi-final" },
] as const;

const ROUND_META: Array<{ key: Round["key"]; label: string }> = [
  { key: "roundOf32", label: "Round of 32" },
  { key: "roundOf16", label: "Round of 16" },
  { key: "quarterFinals", label: "Quarter-finals" },
  { key: "semiFinals", label: "Semi-finals" },
  { key: "thirdPlace", label: "Third place" },
  { key: "final", label: "Final" },
];

function rankSlot(group: string, rank: 1 | 2): Slot {
  return { kind: "rank", group, rank, label: `${rank}${group}` };
}

function thirdSlot(matchNo: number, groups: string): Slot {
  return { kind: "third", matchNo, allowed: groups.split("/"), label: `3rd ${groups}` };
}

function groupLetter(groupName: string) {
  const compact = groupName.trim().toUpperCase();
  const match = compact.match(/[A-L]$/);
  return match?.[0] ?? compact;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeGroupSavedAt(value: unknown) {
  if (!isPlainRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, savedAt]) => {
        const letter = groupLetter(key);
        return GROUP_LETTERS.includes(letter) ? [letter, typeof savedAt === "string" ? savedAt : null] : null;
      })
      .filter((entry): entry is [string, string | null] => Boolean(entry)),
  );
}

function normalizeGroupRankings(groups: PredictorGroup[], initialPath: SavedTournamentPath | null) {
  const rankingByGroup: Record<string, number[]> = {};

  for (const group of groups) {
    const letter = groupLetter(group.groupName);
    const savedRanking = initialPath?.groupRankings?.[letter] ?? initialPath?.groupRankings?.[`Group ${letter}`];
    const validSavedRanking = Array.isArray(savedRanking)
      ? savedRanking.filter((teamId) => group.teams.some((team) => team.id === teamId))
      : [];
    const missingTeamIds = group.teams.map((team) => team.id).filter((teamId) => !validSavedRanking.includes(teamId));
    rankingByGroup[letter] = [...validSavedRanking, ...missingTeamIds].slice(0, 4);
  }

  return rankingByGroup;
}

function normalizeTop8TeamIds(groups: PredictorGroup[], initialPath: SavedTournamentPath | null) {
  const teamGroupById = new Map(groups.flatMap((group) => group.teams.map((team) => [team.id, groupLetter(group.groupName)] as const)));
  const directTop8 = uniqueOnePerGroup(initialPath?.top8TeamIds ?? [], teamGroupById);
  if (directTop8.length > 0) return directTop8.slice(0, 8);

  const legacyGroupRankings = normalizeGroupRankings(groups, initialPath);
  const legacyTeamIds = (initialPath?.thirdPlaceGroups ?? [])
    .map((group) => legacyGroupRankings[groupLetter(group)]?.[2] ?? null)
    .filter((teamId): teamId is number => Number.isFinite(teamId) && Number(teamId) > 0);
  return uniqueOnePerGroup(legacyTeamIds, teamGroupById).slice(0, 8);
}

function uniqueOnePerGroup(teamIds: number[], teamGroupById: Map<number, string>) {
  const seenTeams = new Set<number>();
  const seenGroups = new Set<string>();
  const selected: number[] = [];

  for (const teamId of teamIds) {
    const normalizedTeamId = Number(teamId);
    const group = teamGroupById.get(normalizedTeamId);
    if (!Number.isFinite(normalizedTeamId) || normalizedTeamId <= 0 || !group || seenTeams.has(normalizedTeamId) || seenGroups.has(group)) continue;
    seenTeams.add(normalizedTeamId);
    seenGroups.add(group);
    selected.push(normalizedTeamId);
  }

  return selected;
}

function normalizeTop8TeamIdsFromValue(value: unknown, teamGroupById: Map<number, string>) {
  const teamIds = Array.isArray(value) ? value.map(Number).filter((teamId) => Number.isFinite(teamId) && teamId > 0) : [];
  return uniqueOnePerGroup(teamIds, teamGroupById).slice(0, 8);
}

function normalizeTop8GroupSavedAt(
  value: unknown,
  teamIds: number[],
  teamGroupById: Map<number, string>,
  fallbackSavedAt: string | null,
) {
  const stored = normalizeGroupSavedAt(value);
  const savedAtByGroup: Record<string, string | null> = {};

  for (const teamId of teamIds) {
    const group = teamGroupById.get(teamId);
    if (!group || !GROUP_LETTERS.includes(group)) continue;
    savedAtByGroup[group] = stored[group] ?? fallbackSavedAt ?? null;
  }

  return savedAtByGroup;
}

function normalizeNullableNumberRecord(value: unknown) {
  if (!isPlainRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const numberValue = Number(item);
      return [key, Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null];
    }),
  );
}

function uniqueNumberArray(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => Number.isFinite(value) && Number(value) > 0)));
}

function formatDateTime(value: string | null) {
  return formatEasternDateTime(value, "Schedule pending");
}

function formatCompactDateTime(value: string | null) {
  return formatEasternCompactDateTime(value, "pending").replace(":00 ", " ");
}

function formatCountdown(value: string | null, nowMs: number) {
  if (!value) return "pending";
  const targetMs = new Date(value).getTime();
  if (!Number.isFinite(targetMs)) return "pending";
  const remainingMs = targetMs - nowMs;
  if (remainingMs <= 0) return "now";
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function groupValuesForStartedCount(startedCount: number) {
  if (startedCount >= 2) return { first: 3, second: 2, third: 1 };
  if (startedCount === 1) return { first: 4, second: 3, third: 2 };
  return { first: 6, second: 4, third: 3 };
}

function resolveGroupPointWindow(window: GroupPointWindow | undefined, nowMs: number, locked: boolean) {
  const dropTimes = (window?.dropAt ?? [])
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);
  const startedCount = dropTimes.filter((item) => nowMs >= item.time).length;
  const fallbackValues = window ?? { first: 6, second: 4, third: 3 };
  const values = dropTimes.length > 0 ? groupValuesForStartedCount(startedCount) : fallbackValues;
  const nextDropAt = locked ? null : (dropTimes.find((item) => nowMs < item.time)?.value ?? null);
  return { values, nextDropAt };
}

function shortTeamName(team: PredictorTeam | null) {
  if (!team) return "TBD";
  return team.code || team.name;
}

function signedAuditPoints(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number > 0 ? `+${number}` : String(number);
}

function groupAuditReasonForPosition(reasons: BracketAuditReason[], index: number) {
  const tokens = ["first", "second", "third"];
  const token = tokens[index];
  return reasons.find((reason) => typeof reason.code === "string" && reason.code.includes(`group_${token}`)) ?? null;
}

function fireBracketConfetti(kind: "setup" | "champion") {
  if (typeof window === "undefined") return;

  const colors =
    kind === "champion" ? ["#f0c76a", "#f7f8ff", "#89a2ff", "#a4df70"] : ["#a4df70", "#89a2ff", "#f0c76a"];
  const base = {
    colors,
    disableForReducedMotion: true,
    scalar: kind === "champion" ? 0.94 : 0.78,
    startVelocity: kind === "champion" ? 38 : 26,
    ticks: kind === "champion" ? 180 : 110,
  };

  void confetti({
    ...base,
    particleCount: kind === "champion" ? 120 : 56,
    spread: kind === "champion" ? 78 : 48,
    origin: { x: 0.5, y: kind === "champion" ? 0.18 : 0.24 },
  });

  if (kind === "champion") {
    window.setTimeout(() => {
      void confetti({
        ...base,
        particleCount: 72,
        spread: 60,
        origin: { x: 0.82, y: 0.2 },
      });
    }, 150);
  }
}

export function BracketPredictor({
  groups,
  signedIn,
  firstKickoffAt,
  deadlines,
  groupPointValues,
  initialPath,
  savedAt,
  top8SavedAt: initialTop8SavedAt,
  initialGroupSavedAtByLetter,
  audit,
  knockoutMatchLocksByNo = {},
  actualKnockoutWinnersByNo = {},
}: BracketPredictorProps) {
  const normalizedInitialGroupSavedAt = normalizeGroupSavedAt(initialGroupSavedAtByLetter);
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => groupLetter(a.groupName).localeCompare(groupLetter(b.groupName))),
    [groups],
  );
  const teamsById = useMemo(() => new Map(sortedGroups.flatMap((group) => group.teams.map((team) => [team.id, team] as const))), [sortedGroups]);
  const teamGroupById = useMemo(() => new Map(sortedGroups.flatMap((group) => group.teams.map((team) => [team.id, groupLetter(group.groupName)] as const))), [sortedGroups]);
  const normalizedInitialTop8TeamIds = useMemo(() => normalizeTop8TeamIds(sortedGroups, initialPath), [initialPath, sortedGroups]);
  const normalizedInitialTop8GroupSavedAt = useMemo(
    () => normalizeTop8GroupSavedAt(initialPath?.top8GroupSavedAtByLetter, normalizedInitialTop8TeamIds, teamGroupById, initialTop8SavedAt),
    [initialPath?.top8GroupSavedAtByLetter, initialTop8SavedAt, normalizedInitialTop8TeamIds, teamGroupById],
  );
  const initialNowMs = Date.now();
  const initialTop8OpenMs = new Date(deadlines.top8OpenAt).getTime();
  const top8StartedInitially = Number.isFinite(initialTop8OpenMs) && initialNowMs >= initialTop8OpenMs;
  const initialTop8DirectSaved =
    normalizedInitialTop8TeamIds.length === 8 &&
    normalizedInitialTop8TeamIds.every((teamId) => {
      const group = teamGroupById.get(teamId);
      return Boolean(group && normalizedInitialTop8GroupSavedAt[group]);
    });
  const [groupRankings, setGroupRankings] = useState(() => normalizeGroupRankings(sortedGroups, initialPath));
  const [groupSavedAtByLetter, setGroupSavedAtByLetter] = useState<Record<string, string | null>>(() => normalizedInitialGroupSavedAt);
  const [groupEditUnlockedLetters, setGroupEditUnlockedLetters] = useState<Set<string>>(() => new Set());
  const [top8TeamIds, setTop8TeamIds] = useState<number[]>(() => normalizedInitialTop8TeamIds);
  const [top8GroupSavedAtByLetter, setTop8GroupSavedAtByLetter] = useState<Record<string, string | null>>(() => normalizedInitialTop8GroupSavedAt);
  const [top8SavedAt, setTop8SavedAt] = useState<string | null>(() => initialTop8SavedAt);
  const [winnersByMatch, setWinnersByMatch] = useState<Record<string, number | null>>(() => initialPath?.winnersByMatch ?? {});
  const [groupsSubmitted, setGroupsSubmitted] = useState(() =>
    Boolean(
      (initialPath?.top8TeamIds?.length ?? 0) > 0 ||
        (initialPath?.thirdPlaceGroups?.length ?? 0) > 0 ||
        Object.keys(initialPath?.winnersByMatch ?? {}).length > 0 ||
        top8StartedInitially ||
        GROUP_LETTERS.every((letter) => Boolean(normalizedInitialGroupSavedAt[letter])),
    ),
  );
  const [activeStep, setActiveStep] = useState<BuilderStep>(() => (top8StartedInitially && !initialTop8DirectSaved ? "thirds" : "groups"));
  const [mobileRound, setMobileRound] = useState<Round["key"]>("roundOf32");
  const [busy, setBusy] = useState(false);
  const activeStageRef = useRef<HTMLDivElement | null>(null);
  const draggedTeamRef = useRef<{ group: string; teamId: number } | null>(null);
  const shouldScrollToStage = useRef(false);
  const previousThirdPlaceCount = useRef(top8TeamIds.length);
  const previousChampionId = useRef<number | null>(Number(initialPath?.winnersByMatch?.["104"] ?? initialPath?.champion) || null);
  const [draggingTeamId, setDraggingTeamId] = useState<number | null>(null);
  const [dropTargetTeamId, setDropTargetTeamId] = useState<number | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const scoringStarted = firstKickoffAt ? new Date(firstKickoffAt).getTime() <= Date.now() : false;
  const now = nowMs;
  const groupLocked = now >= new Date(deadlines.groupCutoffAt).getTime();
  const top8Open = now >= new Date(deadlines.top8OpenAt).getTime() && now < new Date(deadlines.top8LockAt).getTime();
  const top8Locked = now >= new Date(deadlines.top8LockAt).getTime();
  const knockoutOpen = now >= new Date(deadlines.knockoutOpenAt).getTime() && now < new Date(deadlines.knockoutLockAt).getTime();
  const knockoutLocked = now >= new Date(deadlines.knockoutLockAt).getTime();
  const thirdPlaceGroups = useMemo(
    () => top8TeamIds.map((teamId) => teamGroupById.get(teamId) ?? "").filter((group) => GROUP_LETTERS.includes(group)).sort(),
    [teamGroupById, top8TeamIds],
  );
  const top8TeamIdByGroup = useMemo(() => {
    const selected = new Map<string, number>();
    for (const teamId of top8TeamIds) {
      const group = teamGroupById.get(teamId);
      if (group && GROUP_LETTERS.includes(group)) selected.set(group, teamId);
    }
    return selected;
  }, [teamGroupById, top8TeamIds]);
  const top8SavedGroupCount = useMemo(
    () => top8TeamIds.filter((teamId) => {
      const group = teamGroupById.get(teamId);
      return Boolean(group && top8GroupSavedAtByLetter[group]);
    }).length,
    [teamGroupById, top8GroupSavedAtByLetter, top8TeamIds],
  );
  const top8DirectSaved = top8TeamIds.length === 8 && top8SavedGroupCount === 8;
  const thirdPlaceSlotGroups = useMemo(() => (groupsSubmitted ? resolveThirdPlaceSlotGroups(thirdPlaceGroups) : {}), [groupsSubmitted, thirdPlaceGroups]);
  const thirdPlaceSlotTeamIds = useMemo(() => {
    return Object.fromEntries(
      Object.entries(thirdPlaceSlotGroups).map(([matchNo, group]) => {
        return [matchNo, top8TeamIdByGroup.get(group) ?? null];
      }),
    );
  }, [thirdPlaceSlotGroups, top8TeamIdByGroup]);

  const resolveSlot = (slot: Slot): PredictorTeam | null => {
    if (slot.kind === "rank") {
      const teamId = groupRankings[slot.group]?.[slot.rank - 1];
      return teamId ? teamsById.get(teamId) ?? null : null;
    }

    const group = thirdPlaceSlotGroups[String(slot.matchNo)];
    const teamId = group ? top8TeamIdByGroup.get(group) : null;
    return teamId ? teamsById.get(teamId) ?? null : null;
  };

  const matchLock = (matchNo: number) => knockoutMatchLocksByNo[String(matchNo)] ?? null;
  const matchIsIndividuallyLocked = (matchNo: number) => Boolean(matchLock(matchNo)?.locked);
  const actualWinnerIdForMatch = (matchNo: number, teams?: [PredictorTeam | null, PredictorTeam | null]) => {
    const actualWinnerId = Number(actualKnockoutWinnersByNo[String(matchNo)]);
    if (!Number.isFinite(actualWinnerId) || actualWinnerId <= 0) return null;
    if (teams && !teams.some((team) => team?.id === actualWinnerId)) return null;
    return actualWinnerId;
  };
  const effectiveWinnerIdForMatch = (matchNo: number, teams?: [PredictorTeam | null, PredictorTeam | null]) => {
    const actualWinnerId = actualWinnerIdForMatch(matchNo, teams);
    if (actualWinnerId) return actualWinnerId;
    const pickedWinnerId = Number(winnersByMatch[String(matchNo)]);
    if (Number.isFinite(pickedWinnerId) && pickedWinnerId > 0) return pickedWinnerId;
    return null;
  };

  const matches = useMemo(() => {
    const byMatch = new Map<number, BracketMatch>();
    const winnerFor = (matchNo: number, teams?: [PredictorTeam | null, PredictorTeam | null]) => {
      const teamId = effectiveWinnerIdForMatch(matchNo, teams);
      return teamId ? teamsById.get(teamId) ?? null : null;
    };
    const loserForMatch = (match: BracketMatch | undefined) => {
      if (!match) return null;
      const winnerId = effectiveWinnerIdForMatch(match.matchNo, match.teams);
      if (!winnerId) return null;
      return match.teams.find((team) => team && team.id !== winnerId) ?? null;
    };

    for (const template of ROUND_OF_32) {
      const teams: [PredictorTeam | null, PredictorTeam | null] = [resolveSlot(template.slots[0]), resolveSlot(template.slots[1])];
      byMatch.set(template.matchNo, {
        matchNo: template.matchNo,
        roundKey: "roundOf32",
        title: "Round of 32",
        teams,
        slotLabels: [template.slots[0].label, template.slots[1].label],
      });
    }

    for (const template of ADVANCEMENT_MATCHES) {
      const sourceA = byMatch.get(template.from[0])?.teams;
      const sourceB = byMatch.get(template.from[1])?.teams;
      byMatch.set(template.matchNo, {
        matchNo: template.matchNo,
        roundKey: template.roundKey,
        title: template.title,
        teams: [winnerFor(template.from[0], sourceA), winnerFor(template.from[1], sourceB)],
        slotLabels: [`W${template.from[0]}`, `W${template.from[1]}`],
      });
    }

    const semi101 = byMatch.get(101);
    const semi102 = byMatch.get(102);
    const loser101 = loserForMatch(semi101);
    const loser102 = loserForMatch(semi102);

    byMatch.set(103, {
      matchNo: 103,
      roundKey: "thirdPlace",
      title: "Third place",
      teams: [loser101, loser102],
      slotLabels: ["L101", "L102"],
    });
    byMatch.set(104, {
      matchNo: 104,
      roundKey: "final",
      title: "Final",
      teams: [winnerFor(101, semi101?.teams), winnerFor(102, semi102?.teams)],
      slotLabels: ["W101", "W102"],
    });

    return Array.from(byMatch.values()).sort((a, b) => a.matchNo - b.matchNo);
  }, [actualKnockoutWinnersByNo, groupRankings, teamsById, thirdPlaceSlotGroups, top8TeamIdByGroup, winnersByMatch]);

  useEffect(() => {
    const pruned = pruneInvalidWinnersByMatch(
      winnersByMatch,
      matches.map((match) => ({ matchNo: match.matchNo, teams: [match.teams[0]?.id ?? null, match.teams[1]?.id ?? null] })),
    );
    if (pruned !== winnersByMatch) setWinnersByMatch(pruned);
  }, [matches, winnersByMatch]);

  const rounds = useMemo<Round[]>(
    () =>
      ROUND_META.map((round) => ({
        ...round,
        matches: matches.filter((match) => match.roundKey === round.key),
      })),
    [matches],
  );

  const effectiveWinnersByMatch = useMemo(() => {
    return Object.fromEntries(
      matches
        .map((match) => {
          const pickedWinnerId = Number(winnersByMatch[String(match.matchNo)]);
          const actualWinnerId = Number(actualKnockoutWinnersByNo[String(match.matchNo)]);
          const winnerId =
            Number.isFinite(actualWinnerId) && actualWinnerId > 0 && match.teams.some((team) => team?.id === actualWinnerId)
              ? actualWinnerId
              : Number.isFinite(pickedWinnerId) && pickedWinnerId > 0
                ? pickedWinnerId
                : null;
          return winnerId ? [String(match.matchNo), winnerId] : null;
        })
        .filter((entry): entry is [string, number] => Boolean(entry)),
    );
  }, [actualKnockoutWinnersByNo, matches, winnersByMatch]);

  const requiredMatches = matches.filter((match) => match.teams[0] && match.teams[1]);
  const pickedRequiredMatches = requiredMatches.filter((match) => Boolean(effectiveWinnersByMatch[String(match.matchNo)]));
  const allBracketSlotsReady = matches.length === 32 && requiredMatches.length === 32;
  const complete = allBracketSlotsReady && pickedRequiredMatches.length === 32;
  const groupsComplete = GROUP_LETTERS.every((group) => (groupRankings[group] ?? []).length === 4);
  const allGroupsSaved = GROUP_LETTERS.every((group) => Boolean(groupSavedAtByLetter[group]));
  const canEnterTop8AfterGroupLock = groupLocked && (top8Open || top8Locked || top8TeamIds.length > 0);
  const thirdsComplete = groupsSubmitted && top8TeamIds.length === 8;
  const bracketReady = groupsComplete && groupsSubmitted && thirdsComplete;
  const champion = effectiveWinnersByMatch["104"] ? teamsById.get(Number(effectiveWinnersByMatch["104"])) ?? null : null;
  const activeRound = rounds.find((round) => round.key === mobileRound) ?? rounds[0];
  const draggingTeam = draggingTeamId ? teamsById.get(draggingTeamId) ?? null : null;
  const draggingRank =
    draggingTeamId && draggedTeamRef.current
      ? (groupRankings[draggedTeamRef.current.group]?.indexOf(draggingTeamId) ?? -1) + 1
      : null;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!shouldScrollToStage.current) return;
    shouldScrollToStage.current = false;

    window.requestAnimationFrame(() => {
      activeStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeStep]);

  useEffect(() => {
    if (previousThirdPlaceCount.current < 8 && top8TeamIds.length === 8) {
      fireBracketConfetti("setup");
    }
    previousThirdPlaceCount.current = top8TeamIds.length;
  }, [top8TeamIds.length]);

  useEffect(() => {
    if (champion?.id && previousChampionId.current !== champion.id) {
      fireBracketConfetti("champion");
    }
    previousChampionId.current = champion?.id ?? null;
  }, [champion?.id]);

  useEffect(() => {
    if (draggingTeamId === null) return;

    function targetFromPointer(event: PointerEvent) {
      return document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-bracket-group][data-bracket-team-id]");
    }

    function handlePointerMove(event: PointerEvent) {
      const target = targetFromPointer(event);
      const teamId = Number(target?.dataset.bracketTeamId);
      setDragPointer({ x: event.clientX, y: event.clientY });
      setDropTargetTeamId(Number.isFinite(teamId) && teamId > 0 && teamId !== draggingTeamId ? teamId : null);
    }

    function handlePointerDrop(event: PointerEvent) {
      const target = targetFromPointer(event);
      const group = target?.dataset.bracketGroup;
      const teamId = Number(target?.dataset.bracketTeamId);

      if (group && Number.isFinite(teamId) && teamId > 0) {
        dropTeamOn(group, teamId);
        return;
      }

      endTeamDrag();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerDrop);
    window.addEventListener("pointercancel", endTeamDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerDrop);
      window.removeEventListener("pointercancel", endTeamDrag);
    };
  }, [draggingTeamId]);

  const payload = useMemo<SavedTournamentPath>(() => {
    const winnerIds = (matchNos: number[]) => uniqueNumberArray(matchNos.map((matchNo) => effectiveWinnersByMatch[String(matchNo)]));
    return {
      roundOf32: uniqueNumberArray(ROUND_OF_32.flatMap((template) => template.slots.map((slot) => resolveSlot(slot)?.id ?? null))),
      roundOf16: winnerIds(range(73, 88)),
      quarterFinalists: winnerIds(range(89, 96)),
      semiFinalists: winnerIds(range(97, 100)),
      finalists: winnerIds([101, 102]),
      champion: Number(effectiveWinnersByMatch["104"]) || null,
      thirdPlaceWinner: Number(effectiveWinnersByMatch["103"]) || null,
      groupRankings,
      thirdPlaceGroups,
      top8TeamIds,
      top8GroupSavedAtByLetter,
      thirdPlaceSlotTeamIds,
      winnersByMatch: effectiveWinnersByMatch,
      knockoutSavedAtByMatchNo: initialPath?.knockoutSavedAtByMatchNo ?? {},
    };
  }, [effectiveWinnersByMatch, groupRankings, initialPath?.knockoutSavedAtByMatchNo, thirdPlaceGroups, thirdPlaceSlotTeamIds, top8GroupSavedAtByLetter, top8TeamIds]);

  function showStep(step: BuilderStep) {
    shouldScrollToStage.current = true;
    if (step === activeStep) {
      activeStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setActiveStep(step);
  }

  function invalidateSetupAfterGroupChange() {
    setGroupsSubmitted(false);
    setWinnersByMatch({});
  }

  function groupIsSavedLocked(group: string) {
    return Boolean(groupSavedAtByLetter[group]) && !groupEditUnlockedLetters.has(group);
  }

  function groupIsInteractionLocked(group: string) {
    return groupLocked || groupIsSavedLocked(group);
  }

  function showGroupEditLockedToast(group: string) {
    if (groupLocked) {
      showLockedToast("Group rankings are locked", "The group ranking cutoff has passed. Previous valid group picks stay saved.");
      return;
    }

    showLockedToast(`Group ${group} is saved`, "Unlock this group before editing. Re-saving a changed order may use a later timestamp and lower its points.");
  }

  function unlockGroupForEditing(group: string) {
    if (groupLocked) {
      showLockedToast("Group rankings are locked", "The group ranking cutoff has passed. Previous valid group picks stay saved.");
      return;
    }

    const ok = window.confirm(
      `Edit Group ${group}? Your current saved pick stays stored until you save again, but changing and re-saving later may lower the points for this group.`,
    );
    if (!ok) return;

    setGroupEditUnlockedLetters((current) => {
      const next = new Set(current);
      next.add(group);
      return next;
    });
    setGroupsSubmitted(false);
    toast.warning(`Group ${group} unlocked for editing`, {
      description: "Your old saved timestamp stays in place until you press Save on this group again.",
    });
  }

  function moveTeam(group: string, teamId: number, direction: -1 | 1) {
    if (groupIsInteractionLocked(group)) {
      showGroupEditLockedToast(group);
      return;
    }

    const ranking = [...(groupRankings[group] ?? [])];
    const index = ranking.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ranking.length) return;

    [ranking[index], ranking[nextIndex]] = [ranking[nextIndex], ranking[index]];
    setGroupRankings((current) => ({ ...current, [group]: ranking }));
    invalidateSetupAfterGroupChange();
  }

  function startTeamDrag(group: string, teamId: number, pointer?: { x: number; y: number }) {
    if (groupIsInteractionLocked(group)) {
      showGroupEditLockedToast(group);
      return;
    }

    draggedTeamRef.current = { group, teamId };
    setDraggingTeamId(teamId);
    setDragPointer(pointer ?? null);
    setDropTargetTeamId(null);
  }

  function dropTeamOn(group: string, targetTeamId: number) {
    const draggedTeam = draggedTeamRef.current;
    draggedTeamRef.current = null;
    setDraggingTeamId(null);
    setDropTargetTeamId(null);
    setDragPointer(null);

    if (groupIsInteractionLocked(group)) {
      showGroupEditLockedToast(group);
      return;
    }

    if (!draggedTeam || draggedTeam.group !== group || draggedTeam.teamId === targetTeamId) return;

    const ranking = [...(groupRankings[group] ?? [])];
    const fromIndex = ranking.indexOf(draggedTeam.teamId);
    const toIndex = ranking.indexOf(targetTeamId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [movedTeam] = ranking.splice(fromIndex, 1);
    ranking.splice(toIndex, 0, movedTeam);
    setGroupRankings((current) => ({ ...current, [group]: ranking }));
    invalidateSetupAfterGroupChange();
  }

  function endTeamDrag() {
    draggedTeamRef.current = null;
    setDraggingTeamId(null);
    setDropTargetTeamId(null);
    setDragPointer(null);
  }

  function toggleTop8Team(team: PredictorTeam) {
    if (!top8Open) {
      showLockedToast(top8Locked ? "Top 8 is locked" : "Top 8 is not open yet", top8Locked ? "Previous valid Top 8 picks stay saved." : `Top 8 opens ${formatDateTime(deadlines.top8OpenAt)}.`);
      return;
    }

    if (!groupsSubmitted && !canEnterTop8AfterGroupLock) {
      showStep("groups");
      toast.warning("Confirm your groups first", {
        description: "Use Continue to top 8 when the group order is ready.",
      });
      return;
    }
    if (!groupsSubmitted && canEnterTop8AfterGroupLock) setGroupsSubmitted(true);

    const group = teamGroupById.get(team.id);
    if (!group) {
      toast.warning("Team group missing", {
        description: "This team is missing an official group, so it cannot be used for Top 8.",
      });
      return;
    }

    setTop8TeamIds((current) => {
      if (current.includes(team.id)) {
        if (top8GroupSavedAtByLetter[group]) {
          toast.warning(`Group ${group} is saved`, {
            description: "Use the Unsave button in this group before removing or changing this Top 8 pick.",
          });
          return current;
        }
        setTop8GroupSavedAtByLetter((savedAt) => ({ ...savedAt, [group]: null }));
        return current.filter((item) => item !== team.id);
      }

      const existingFromGroup = current.find((teamId) => teamGroupById.get(teamId) === group);
      if (existingFromGroup) {
        toast.warning(`Group ${group} already has a Top 8 pick`, {
          description: "Only one third-place team can come from each group. Remove that pick first.",
        });
        return current;
      }

      if (current.length >= 8) {
        toast.warning("Eight third-place teams advance", {
          description: "Remove one selected team before adding another.",
        });
        return current;
      }
      setTop8GroupSavedAtByLetter((savedAt) => ({ ...savedAt, [group]: null }));
      return [...current, team.id];
    });
  }

  function pickWinner(match: BracketMatch, team: PredictorTeam | null) {
    if (knockoutLocked) {
      showLockedToast("Knockout bracket is locked", "Previous valid knockout picks stay saved.");
      return;
    }

    if (!bracketReady) {
      showStep(groupsComplete && groupsSubmitted ? "thirds" : "groups");
      toast.warning("Finish setup before the bracket", {
        description: "Confirm group order with Continue to top 8, then select exactly eight third-place teams.",
      });
      return;
    }

    if (!knockoutOpen) {
      showLockedToast("Round of 32 is not open yet", `It opens ${formatDateTime(deadlines.knockoutOpenAt)} after the group stage is complete.`);
      return;
    }

    if (!team) {
      toast.warning("That slot is not ready yet", {
          description:
          top8TeamIds.length === 8
            ? "Pick the earlier matchup first, then this team can advance."
            : "Rank every group and choose exactly eight third-place teams first.",
      });
      return;
    }

    if (!match.teams[0] || !match.teams[1]) {
      toast.warning("Finish the matchup setup first", {
        description: "Both sides of a match must be known before a winner can move on.",
      });
      return;
    }

    if (match.roundKey === "roundOf32" && matchIsIndividuallyLocked(match.matchNo)) {
      const kickoffAt = matchLock(match.matchNo)?.kickoffAt;
      showLockedToast(
        `Match ${match.matchNo} has kicked off`,
        kickoffAt
          ? `That Round of 32 slot locked at ${formatDateTime(kickoffAt)}. If it was not saved before kickoff, that slot scores 0 and the real winner can only move forward after the result is known.`
          : "That Round of 32 slot is locked. Previous valid picks stay saved.",
      );
      return;
    }

    setWinnersByMatch((current) => ({ ...current, [String(match.matchNo)]: team.id }));
    toast.success(`${team.name} advanced`, {
      description: `Match ${match.matchNo} updated. Downstream picks adjust automatically.`,
    });
  }

  function resetBoard() {
    if (knockoutLocked) {
      showLockedToast("Knockout bracket is locked", "Previous valid knockout picks stay saved.");
      return;
    }

    if (!knockoutOpen) {
      showLockedToast("Round of 32 is not open yet", `Knockout picks open ${formatDateTime(deadlines.knockoutOpenAt)}.`);
      return;
    }

    setWinnersByMatch({});
    toast.info("Knockout picks cleared", {
      description:
        Object.keys(actualKnockoutWinnersByNo).length > 0
          ? "Your draft picks were cleared. Finished Round of 32 results stay visible as true winners."
          : "Group rankings and third-place selections stayed in place.",
    });
  }

  function applyTournamentPathResult(result: any, fallbackTeamIds = top8TeamIds) {
    const path = isPlainRecord(result?.prediction?.path) ? result.prediction.path : null;
    const nextTop8TeamIds = path ? normalizeTop8TeamIdsFromValue(path.top8TeamIds, teamGroupById) : fallbackTeamIds;
    const nextTop8SubmittedAt = typeof result?.prediction?.top8_submitted_at === "string" ? result.prediction.top8_submitted_at : null;

    setTop8TeamIds(nextTop8TeamIds);
    setTop8SavedAt(nextTop8SubmittedAt);
    setTop8GroupSavedAtByLetter(
      normalizeTop8GroupSavedAt(path?.top8GroupSavedAtByLetter, nextTop8TeamIds, teamGroupById, nextTop8SubmittedAt),
    );
    if (path && isPlainRecord(path.winnersByMatch)) {
      setWinnersByMatch(normalizeNullableNumberRecord(path.winnersByMatch));
    }
  }

  async function savePath(mode: "group" | "groups" | "top8" | "full" = "full", targetGroup?: string) {
    if (!signedIn) {
      toast.warning("Sign in to save the full path", {
        description: "You can keep building the board here, then sign in before submitting.",
      });
      return;
    }

    if (mode === "group") {
      const group = targetGroup ? groupLetter(targetGroup) : "";
      if (groupLocked) {
        showLockedToast("Group rankings are locked", "The group ranking cutoff has passed. Previous valid group picks stay saved.");
        return;
      }
      if (!GROUP_LETTERS.includes(group)) {
        toast.error("Group was not saved", { description: "That group could not be identified." });
        return;
      }
      if ((groupRankings[group] ?? []).length !== 4) {
        toast.warning(`Finish Group ${group} first`, {
          description: "A group needs four ranked teams before its own save can be locked.",
        });
        return;
      }
    }

    if (mode === "groups") {
      if (groupLocked) {
        showLockedToast("Group rankings are locked", "The group ranking cutoff has passed. Previous valid group picks stay saved.");
        return;
      }
      if (!groupsComplete) {
        showStep("groups");
        toast.warning("Finish every group first", {
          description: "Each group needs four ranked teams before you save group picks.",
        });
        return;
      }
      setGroupsSubmitted(true);
    }

    if ((mode === "top8" || mode === "full") && !groupsSubmitted && !canEnterTop8AfterGroupLock) {
      showStep("groups");
      toast.warning("Confirm your group picks first", {
        description: "Use Continue to top 8 once every group order is ready.",
      });
      return;
    }
    if ((mode === "top8" || mode === "full") && !groupsSubmitted && canEnterTop8AfterGroupLock) setGroupsSubmitted(true);

    if (mode === "top8" && !top8Open) {
      showLockedToast(top8Locked ? "Top 8 is locked" : "Top 8 is not open yet", top8Locked ? "Previous valid Top 8 picks stay saved." : `Top 8 opens ${formatDateTime(deadlines.top8OpenAt)}.`);
      return;
    }

    if ((mode === "top8" || mode === "full") && top8TeamIds.length !== 8) {
      showStep("thirds");
      toast.warning("Choose eight third-place qualifiers", {
        description: "The 2026 bracket needs exactly eight third-place teams before it can be submitted.",
      });
      return;
    }

    if (mode === "full" && knockoutLocked) {
      showLockedToast("Knockout bracket is locked", "Previous valid knockout picks stay saved.");
      return;
    }

    if (mode === "full" && !knockoutOpen) {
      showLockedToast("Round of 32 is not open yet", `Knockout picks open ${formatDateTime(deadlines.knockoutOpenAt)}.`);
      return;
    }

    if (mode === "full" && !complete) {
      showStep("bracket");
      toast.warning("Pick every knockout match first", {
        description: "The summary unlocks after Round of 32, Round of 16, quarter-finals, semi-finals, third place, and final are complete.",
      });
      return;
    }

    setBusy(true);
    try {
      const body = mode === "group" && targetGroup ? { ...payload, groupScope: [groupLetter(targetGroup)] } : payload;
      const response = await fetch("/api/predictions/tournament", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error ?? `HTTP ${response.status}`);
      const nextGroupSavedAt = normalizeGroupSavedAt(result?.groupSavedAtByLetter);
      const mergedGroupSavedAt = Object.keys(nextGroupSavedAt).length > 0 ? nextGroupSavedAt : groupSavedAtByLetter;
      if (Object.keys(nextGroupSavedAt).length > 0) setGroupSavedAtByLetter(nextGroupSavedAt);
      if (mode === "group" && targetGroup) {
        const savedGroup = groupLetter(targetGroup);
        setGroupEditUnlockedLetters((current) => {
          const next = new Set(current);
          next.delete(savedGroup);
          return next;
        });
        if (GROUP_LETTERS.every((letter) => Boolean(mergedGroupSavedAt[letter]))) setGroupsSubmitted(true);
      }
      if (mode === "top8" || mode === "full") {
        applyTournamentPathResult(result);
      }

      toast.success(mode === "group" ? `Group ${groupLetter(targetGroup ?? "")} saved` : mode === "groups" ? "Group picks saved" : mode === "top8" ? "Top 8 saved" : "Bracket path saved", {
        description:
          mode === "group"
            ? "This group now has its own locked scoring timestamp."
            : mode === "groups"
            ? "Your group rankings have their own scoring timestamp."
            : mode === "top8"
              ? "Your Top 8 third-place picks have their own scoring timestamp."
              : "Your knockout prediction is ready for progression scoring.",
      });
    } catch (error) {
      toast.error("Bracket path was not saved", {
        description: error instanceof Error ? error.message : "Try again before the tournament lock.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveTop8Group(groupInput: string) {
    const group = groupLetter(groupInput);
    const teamId = top8TeamIdByGroup.get(group);
    if (!signedIn) {
      toast.warning("Sign in to save this Top 8 pick", {
        description: "Your draft stays on this device until you sign in.",
      });
      return;
    }
    if (!top8Open) {
      showLockedToast(top8Locked ? "Top 8 is locked" : "Top 8 is not open yet", top8Locked ? "Previous valid Top 8 picks stay saved." : `Top 8 opens ${formatDateTime(deadlines.top8OpenAt)}.`);
      return;
    }
    if (!teamId) {
      toast.warning(`Choose a Group ${group} team first`, {
        description: "Each group saves its own Top 8 pick after you select one team.",
      });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/predictions/tournament", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-top8-group", group, teamId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error ?? `HTTP ${response.status}`);

      applyTournamentPathResult(result);
      toast.success(`Group ${group} Top 8 saved`, {
        description: "Only this group was stamped. Other Top 8 boxes were left alone.",
      });
    } catch (error) {
      toast.error(`Group ${group} was not saved`, {
        description: error instanceof Error ? error.message : "Try again while the Top 8 window is open.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function unsaveTop8Group(groupInput: string) {
    const group = groupLetter(groupInput);
    const teamId = top8TeamIdByGroup.get(group);
    const savedAt = top8GroupSavedAtByLetter[group] ?? null;
    if (!teamId && !savedAt) {
      toast.info(`No Group ${group} Top 8 pick to unsave`, {
        description: "Choose a team first, then save it when ready.",
      });
      return;
    }

    if (!top8Open) {
      showLockedToast(top8Locked ? "Top 8 is locked" : "Top 8 is not open yet", top8Locked ? "Saved Top 8 picks are preserved after lock." : `Top 8 opens ${formatDateTime(deadlines.top8OpenAt)}.`);
      return;
    }

    const ok = window.confirm(
      `Unsave Group ${group} Top 8 pick? This removes only this group's Top 8 pick/timestamp and clears knockout picks that depend on the Top 8. Your saved group rankings stay locked.`,
    );
    if (!ok) return;

    if (!signedIn || !savedAt) {
      setTop8TeamIds((current) => current.filter((item) => teamGroupById.get(item) !== group));
      setTop8GroupSavedAtByLetter((current) => ({ ...current, [group]: null }));
      setTop8SavedAt(null);
      setWinnersByMatch({});
      toast.info(`Group ${group} Top 8 draft cleared`, {
        description: signedIn ? "That group was not stamped yet, so only the local draft changed." : "Sign in before saving your final Top 8.",
      });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/predictions/tournament", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear-top8-group", group }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error ?? `HTTP ${response.status}`);

      applyTournamentPathResult(result);
      toast.success(`Group ${group} Top 8 unsaved`, {
        description: "Only this group was removed. Other saved Top 8 groups stayed stamped.",
      });
    } catch (error) {
      toast.error(`Group ${group} was not unsaved`, {
        description: error instanceof Error ? error.message : "Try again while the Top 8 window is open.",
      });
    } finally {
      setBusy(false);
    }
  }

  function showLockedToast(title = "Prediction window is locked", description = "Previous valid picks are preserved.") {
    toast.error(title, {
      description,
    });
  }

  function goToThirds() {
    if (!groupsComplete) {
      toast.warning("Finish every group first", {
        description: "Each group needs four ranked teams before the third-place pool opens.",
      });
      return;
    }

    if (!allGroupsSaved && !canEnterTop8AfterGroupLock) {
      showStep("groups");
      toast.warning("Save each group first", {
        description: "Every group needs its own saved timestamp before Top 8 opens.",
      });
      return;
    }

    if (!top8Open && !top8Locked && top8TeamIds.length === 0) {
      showLockedToast(
        "Top 8 is not open yet",
        `Top 8 opens in ${formatCountdown(deadlines.top8OpenAt, nowMs)} at ${formatDateTime(deadlines.top8OpenAt)}.`,
      );
      return;
    }

    setGroupsSubmitted(true);
    showStep("thirds");
  }

  function goToBracket() {
    if (!groupsComplete) {
      showStep("groups");
      toast.warning("Group picks come first", {
        description: "Rank all 12 groups before opening the knockout bracket.",
      });
      return;
    }

    if (!groupsSubmitted && !canEnterTop8AfterGroupLock) {
      showStep("groups");
      toast.warning("Confirm groups before Top 8", {
        description: "Use Continue to top 8 once the saved group order is ready.",
      });
      return;
    }
    if (!groupsSubmitted && canEnterTop8AfterGroupLock) setGroupsSubmitted(true);

    if (!thirdsComplete) {
      showStep("thirds");
      toast.warning("Pick exactly eight third-place teams", {
        description: "The Round of 32 cannot be placed until the top-eight third-place pool is ready.",
      });
      return;
    }

    if (!knockoutOpen) {
      showStep("thirds");
      showLockedToast(
        "Round of 32 is not open yet",
        `It opens in ${formatCountdown(deadlines.knockoutOpenAt, nowMs)} at ${formatDateTime(deadlines.knockoutOpenAt)}.`,
      );
      return;
    }

    showStep("bracket");
  }

  return (
    <main className="bracket-studio grid w-full max-w-full gap-2.5 overflow-x-hidden md:gap-3">
      {draggingTeam && dragPointer ? <DragTeamPreview team={draggingTeam} rank={draggingRank ?? 0} pointer={dragPointer} /> : null}

      <section className="bracket-hero-card premium-card p-3 md:p-5">
        <div className="bracket-hero-grid grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(460px,1fr)] xl:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="wc-label">Tournament path</p>
              <Badge variant="secondary" className="bracket-status-pill border border-electric/25 bg-electric/10 text-electric-foreground">
                Projected until official
              </Badge>
              <Badge variant={scoringStarted ? "secondary" : "secondary"} className="bracket-lock-pill-modern border border-white/10">
                {scoringStarted ? "Scoring windows active" : `Scoring starts ${formatDateTime(firstKickoffAt)}`}
              </Badge>
              <BracketPointsGuideDialog compact />
            </div>
            <h1 className="bracket-hero-title max-w-5xl text-balance text-[clamp(1.65rem,8vw,2.25rem)] font-black leading-[0.98] tracking-normal md:text-[clamp(2rem,3vw,3.25rem)]">
              Build your full World Cup path
            </h1>
            <p className="bracket-hero-copy mt-2 max-w-3xl text-xs font-semibold leading-5 text-muted-foreground sm:text-sm md:mt-3 md:text-base md:leading-6">
              Rank the groups, choose the Top 8 thirds, then build the knockout path before the final Round of 32 lock.
            </p>
            <BracketMomentumStrip activeStep={activeStep} champion={champion} />
            <BracketDeadlineStrip
              nowMs={nowMs}
              deadlines={deadlines}
              groupLocked={groupLocked}
              top8Open={top8Open}
              top8Locked={top8Locked}
              knockoutOpen={knockoutOpen}
              knockoutLocked={knockoutLocked}
            />
          </div>

          <StepRail
            activeStep={activeStep}
            groupsComplete={groupsComplete}
            groupsSubmitted={groupsSubmitted}
            thirdsComplete={thirdsComplete}
            bracketComplete={complete}
            champion={champion}
            nowMs={nowMs}
            top8Open={top8Open}
            top8Locked={top8Locked}
            top8OpenAt={deadlines.top8OpenAt}
            top8LockAt={deadlines.top8LockAt}
            knockoutOpen={knockoutOpen}
            knockoutOpenAt={deadlines.knockoutOpenAt}
            knockoutLocked={knockoutLocked}
            knockoutLockAt={deadlines.knockoutLockAt}
            hasTop8Picks={top8TeamIds.length > 0}
            onStep={showStep}
          />
        </div>
      </section>

      {top8Open && !top8DirectSaved ? (
        <section className="rounded-xl border border-trophy-gold/25 bg-trophy-gold/10 p-3 text-sm font-semibold leading-5 text-trophy-gold shadow-[inset_0_1px_0_rgba(255,255,255,.06)] md:flex md:items-center md:justify-between md:gap-3 md:p-4">
          <span className="inline-flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Top 8 is open. Save eight picks before June 24 at 3:00 PM so they count for scoring.</span>
          </span>
          {activeStep !== "thirds" ? (
            <Button type="button" size="sm" className="mt-2 h-9 rounded-lg md:mt-0" onClick={() => showStep("thirds")}>
              Make Top 8 picks
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </section>
      ) : null}

      <div ref={activeStageRef} className="scroll-mt-3" data-bracket-active-stage>
        {activeStep === "groups" ? (
          <GroupSetupStage
            groups={sortedGroups}
            groupRankings={groupRankings}
            teamsById={teamsById}
            locked={groupLocked}
            groupPointValues={groupPointValues}
            groupSavedAtByLetter={groupSavedAtByLetter}
            groupEditUnlockedLetters={groupEditUnlockedLetters}
            audit={audit}
            groupCutoffAt={deadlines.groupCutoffAt}
            top8Open={top8Open}
            top8Locked={top8Locked}
            top8OpenAt={deadlines.top8OpenAt}
            nowMs={nowMs}
            hasTop8Picks={top8TeamIds.length > 0}
            onMoveTeam={moveTeam}
            draggingTeamId={draggingTeamId}
            dropTargetTeamId={dropTargetTeamId}
            onStartTeamDrag={startTeamDrag}
            onDropTeam={dropTeamOn}
            onContinue={goToThirds}
            onSaveGroup={(group) => savePath("group", group)}
            onUnlockGroup={unlockGroupForEditing}
          />
        ) : null}

        {activeStep === "thirds" ? (
          <ThirdsSetupStage
            groups={sortedGroups}
            teamsById={teamsById}
            teamGroupById={teamGroupById}
            top8TeamIds={top8TeamIds}
            top8DirectSaved={top8DirectSaved}
            top8SavedAt={top8SavedAt}
            top8GroupSavedAtByLetter={top8GroupSavedAtByLetter}
            audit={audit?.top8 ?? null}
            thirdPlaceGroups={thirdPlaceGroups}
            thirdPlaceSlotGroups={thirdPlaceSlotGroups}
            top8Open={top8Open}
            top8Locked={top8Locked}
            top8OpenAt={deadlines.top8OpenAt}
            top8LockAt={deadlines.top8LockAt}
            nowMs={nowMs}
            knockoutOpen={knockoutOpen}
            knockoutOpenAt={deadlines.knockoutOpenAt}
            knockoutLocked={knockoutLocked}
            busy={busy}
            onToggleTeam={toggleTop8Team}
            onBack={() => showStep("groups")}
            onContinue={goToBracket}
            onSave={() => savePath("top8")}
            onSaveGroup={saveTop8Group}
            onUnsaveGroup={unsaveTop8Group}
          />
        ) : null}

        {activeStep === "bracket" ? (
          <BracketStage
            rounds={rounds}
            winnersByMatch={effectiveWinnersByMatch}
            pickedCount={pickedRequiredMatches.length}
            champion={champion}
            signedIn={signedIn}
            busy={busy}
            open={knockoutOpen}
            locked={knockoutLocked}
            knockoutOpenAt={deadlines.knockoutOpenAt}
            knockoutLockAt={deadlines.knockoutLockAt}
            nowMs={nowMs}
            activeRound={activeRound}
            mobileRound={mobileRound}
            onMobileRound={setMobileRound}
            onPick={pickWinner}
            onReset={resetBoard}
            onSave={() => savePath("full")}
            onBack={() => showStep("thirds")}
            onSummary={() => showStep("summary")}
            complete={complete}
            knockoutMatchLocksByNo={knockoutMatchLocksByNo}
            actualWinnersByMatch={actualKnockoutWinnersByNo}
          />
        ) : null}

        {activeStep === "summary" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="bracket-stage-card bracket-summary-stage premium-card p-4 md:p-5">
              {complete ? (
                <ShareableSummaryPreview champion={champion} payload={payload} teamsById={teamsById} savedAt={savedAt} />
              ) : (
                <div className="grid min-h-[320px] place-items-center text-center">
                  <div className="max-w-2xl">
                    <Image src="/assets/ui/trophy.png" alt="" width={86} height={86} className="mx-auto mb-5 h-[4.8rem] w-auto object-contain" />
                    <h2 className="text-[clamp(2rem,4vw,4rem)] font-black leading-none">Finish the bracket to unlock the summary.</h2>
                    <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-muted-foreground">
                      Go back to the bracket and pick every remaining matchup.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => showStep("bracket")}>
                  Back to bracket
                </Button>
                {complete ? (
                  <Button
                    onClick={() => savePath("full")}
                    disabled={busy || knockoutLocked}
                    className="border-trophy-gold/45 bg-trophy-gold text-[#11131c] shadow-[0_0_0_1px_rgba(214,178,96,.3),0_14px_44px_rgba(214,178,96,.22)] hover:bg-trophy-gold/90"
                  >
                    <Save className="size-4" />
                    {busy ? "Saving" : "Save final bracket"}
                  </Button>
                ) : null}
              </div>
            </div>
            <aside className="bracket-side-panel premium-card p-4">
              <SummaryPanel
                complete={complete}
                signedIn={signedIn}
                champion={champion}
                picked={pickedRequiredMatches.length}
                savedAt={savedAt}
                payload={payload}
                savePath={savePath}
                busy={busy}
                locked={!knockoutOpen || knockoutLocked}
              />
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function BracketMomentumStrip({ activeStep, champion }: { activeStep: BuilderStep; champion: PredictorTeam | null }) {
  const stageLabel =
    champion?.name ??
    {
      groups: "Group table",
      thirds: "Top 8 pool",
      bracket: "Knockout run",
      summary: "Final path",
    }[activeStep];

  return (
    <div className="bracket-momentum-strip mt-4 hidden gap-2 sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div className="bracket-trophy-plate relative grid min-h-20 place-items-center overflow-hidden rounded-xl border border-trophy-gold/25 bg-trophy-gold/10">
        <Image src="/assets/ui/trophy.png" alt="" width={84} height={84} className="relative z-10 h-[4.7rem] w-auto object-contain" priority />
      </div>
      <div className="bracket-kit-plate relative min-h-20 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045]">
        <Image
          src="/assets/ui/kit-library-full.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 520px"
          className="object-cover opacity-[0.42]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/92 via-navy-950/64 to-navy-950/18" />
        <div className="relative z-10 flex h-full min-h-20 items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="wc-label truncate">Current lane</p>
            <p className="mt-1 truncate text-lg font-black text-foreground">{stageLabel}</p>
          </div>
          <span className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 font-mono text-xs font-black text-muted-foreground">
            2026
          </span>
        </div>
      </div>
    </div>
  );
}

function BracketDeadlineStrip({
  nowMs,
  deadlines,
  groupLocked,
  top8Open,
  top8Locked,
  knockoutOpen,
  knockoutLocked,
}: {
  nowMs: number;
  deadlines: BracketPredictorProps["deadlines"];
  groupLocked: boolean;
  top8Open: boolean;
  top8Locked: boolean;
  knockoutOpen: boolean;
  knockoutLocked: boolean;
}) {
  const top8Status = top8Open
    ? { label: "Top 8 locks in", value: formatCountdown(deadlines.top8LockAt, nowMs), date: formatDateTime(deadlines.top8LockAt), done: false }
    : top8Locked
      ? { label: "Top 8", value: "Locked", date: formatDateTime(deadlines.top8LockAt), done: true }
      : { label: "Top 8 opens in", value: formatCountdown(deadlines.top8OpenAt, nowMs), date: formatDateTime(deadlines.top8OpenAt), done: false };

  const items = [
    {
      label: groupLocked ? "Group picks" : "Group picks lock in",
      value: groupLocked ? "Locked" : formatCountdown(deadlines.groupCutoffAt, nowMs),
      date: formatDateTime(deadlines.groupCutoffAt),
      done: groupLocked,
    },
    top8Status,
    {
      label: knockoutLocked ? "Knockout bracket" : knockoutOpen ? "Knockout locks in" : "Knockout opens in",
      value: knockoutLocked ? "Locked" : knockoutOpen ? formatCountdown(deadlines.knockoutLockAt, nowMs) : formatCountdown(deadlines.knockoutOpenAt, nowMs),
      date: knockoutOpen || knockoutLocked ? formatDateTime(deadlines.knockoutLockAt) : formatDateTime(deadlines.knockoutOpenAt),
      done: knockoutLocked,
    },
  ];

  return (
    <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] md:p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-muted-foreground">{item.label}</span>
            {item.done ? <Lock className="size-4 text-muted-foreground" /> : <Clock className="size-4 text-trophy-gold" />}
          </div>
          <p className="font-mono text-lg font-black text-trophy-gold">{item.value}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.date}</p>
        </div>
      ))}
    </div>
  );
}

function ProgressTile({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  return (
    <div className="bracket-progress-tile rounded-lg border border-white/10 bg-white/[0.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] md:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
        {complete ? <Check className="size-4 text-pitch-green" /> : <Circle className="size-4 text-muted-foreground" />}
      </div>
      <p className="truncate text-sm font-black">{value}</p>
    </div>
  );
}

function StepRail({
  activeStep,
  groupsComplete,
  groupsSubmitted,
  thirdsComplete,
  bracketComplete,
  champion,
  nowMs,
  top8Open,
  top8Locked,
  top8OpenAt,
  top8LockAt,
  knockoutOpen,
  knockoutOpenAt,
  knockoutLocked,
  knockoutLockAt,
  hasTop8Picks,
  onStep,
}: {
  activeStep: BuilderStep;
  groupsComplete: boolean;
  groupsSubmitted: boolean;
  thirdsComplete: boolean;
  bracketComplete: boolean;
  champion: PredictorTeam | null;
  nowMs: number;
  top8Open: boolean;
  top8Locked: boolean;
  top8OpenAt: string;
  top8LockAt: string;
  knockoutOpen: boolean;
  knockoutOpenAt: string;
  knockoutLocked: boolean;
  knockoutLockAt: string;
  hasTop8Picks: boolean;
  onStep: (step: BuilderStep) => void;
}) {
  const top8Meta = !groupsSubmitted
    ? "Save groups first"
    : top8Open
      ? `Locks in ${formatCountdown(top8LockAt, nowMs)}`
      : top8Locked
        ? "Locked"
        : `Opens in ${formatCountdown(top8OpenAt, nowMs)}`;
  const bracketMeta = !thirdsComplete
    ? "Top 8 first"
    : knockoutLocked
      ? "Locked"
      : knockoutOpen
        ? `Locks in ${formatCountdown(knockoutLockAt, nowMs)}`
        : `Opens in ${formatCountdown(knockoutOpenAt, nowMs)}`;
  const steps: Array<{ key: BuilderStep; title: string; meta: string; complete: boolean; enabled: boolean }> = [
    { key: "groups", title: "Groups", meta: groupsComplete ? "12 ranked" : "Rank all 12", complete: groupsComplete, enabled: true },
    {
      key: "thirds",
      title: "Top 8",
      meta: thirdsComplete ? "Pool ready" : top8Meta,
      complete: thirdsComplete,
      enabled: groupsSubmitted && (top8Open || top8Locked || hasTop8Picks),
    },
    { key: "bracket", title: "Bracket", meta: bracketMeta, complete: bracketComplete, enabled: groupsSubmitted && thirdsComplete && knockoutOpen && !knockoutLocked },
    { key: "summary", title: "Summary", meta: champion ? shortTeamName(champion) : "Champion pending", complete: bracketComplete, enabled: bracketComplete },
  ];

  return (
    <nav className="bracket-step-rail grid grid-cols-2 gap-2 2xl:grid-cols-4" aria-label="Bracket setup steps">
      {steps.map((step, index) => (
        <button
          key={step.key}
          type="button"
          disabled={!step.enabled}
          onClick={() => onStep(step.key)}
          className={cn(
            "bracket-step-tile group grid min-h-[3.65rem] grid-cols-[1.65rem_minmax(0,1fr)] items-center gap-2 rounded-xl border p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.07)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 md:min-h-[4.6rem] md:grid-cols-[2rem_minmax(0,1fr)] md:gap-3 md:p-3",
            activeStep === step.key
              ? "is-active border-electric/60 bg-electric/16 text-foreground"
              : "border-white/10 bg-white/[0.045] text-muted-foreground hover:border-white/20 hover:bg-white/[0.065]",
            step.complete && "is-complete",
          )}
        >
          <span
            className={cn(
              "bracket-step-index grid size-6 place-items-center rounded-md border font-mono text-[0.68rem] font-black md:size-8 md:rounded-lg md:text-xs",
              step.complete ? "border-pitch-green/35 bg-pitch-green/12 text-pitch-green" : "border-white/10 bg-navy-950/60 text-muted-foreground",
            )}
          >
            {step.complete ? <Check className="size-4" /> : index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black md:text-sm">{step.title}</span>
            <span className="mt-0.5 block truncate text-[0.66rem] font-semibold text-muted-foreground md:text-xs">{step.meta}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}

function GroupSetupStage({
  groups,
  groupRankings,
  teamsById,
  locked,
  groupPointValues,
  groupSavedAtByLetter,
  groupEditUnlockedLetters,
  audit,
  groupCutoffAt,
  top8Open,
  top8Locked,
  top8OpenAt,
  nowMs,
  hasTop8Picks,
  onMoveTeam,
  draggingTeamId,
  dropTargetTeamId,
  onStartTeamDrag,
  onDropTeam,
  onContinue,
  onSaveGroup,
  onUnlockGroup,
}: {
  groups: PredictorGroup[];
  groupRankings: Record<string, number[]>;
  teamsById: Map<number, PredictorTeam>;
  locked: boolean;
  groupPointValues: Record<string, GroupPointWindow>;
  groupSavedAtByLetter: Record<string, string | null>;
  groupEditUnlockedLetters: Set<string>;
  audit?: OwnBracketAudit | null;
  groupCutoffAt: string;
  top8Open: boolean;
  top8Locked: boolean;
  top8OpenAt: string;
  nowMs: number;
  hasTop8Picks: boolean;
  onMoveTeam: (group: string, teamId: number, direction: -1 | 1) => void;
  draggingTeamId: number | null;
  dropTargetTeamId: number | null;
  onStartTeamDrag: (group: string, teamId: number, pointer?: { x: number; y: number }) => void;
  onDropTeam: (group: string, targetTeamId: number) => void;
  onContinue: () => void;
  onSaveGroup: (group: string) => void;
  onUnlockGroup: (group: string) => void;
}) {
  const groupsComplete = GROUP_LETTERS.every((group) => (groupRankings[group] ?? []).length === 4);
  const allGroupsSaved = GROUP_LETTERS.every((group) => Boolean(groupSavedAtByLetter[group]));
  const canOpenTop8 = top8Open || top8Locked || hasTop8Picks;
  const canEnterTop8AfterGroupLock = locked && canOpenTop8;
  const continueLocked = !groupsComplete || (!allGroupsSaved && !canEnterTop8AfterGroupLock) || !canOpenTop8;
  const continueLabel = !groupsComplete
    ? "Rank all groups"
    : !allGroupsSaved && !canEnterTop8AfterGroupLock
      ? "Save each group"
    : hasTop8Picks && !top8Open
      ? "Review saved Top 8"
    : top8Open
      ? "Continue to top 8"
      : top8Locked
        ? "Review locked Top 8"
        : `Top 8 opens in ${formatCountdown(top8OpenAt, nowMs)}`;

  return (
    <section className="bracket-stage-card bracket-groups-stage premium-card p-3 md:p-5">
      <div className="bracket-stage-heading mb-3 grid gap-3 md:mb-5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <div className="bracket-stage-kicker is-gold mb-2 inline-flex items-center gap-2 rounded-lg border border-trophy-gold/25 bg-trophy-gold/10 px-2.5 py-1.5 text-[0.7rem] font-black uppercase text-trophy-gold md:mb-3 md:px-3 md:py-2 md:text-xs">
            <Trophy className="size-4" />
            Start here
          </div>
          <h2 className="bracket-stage-title text-[clamp(1.45rem,7vw,2rem)] font-black leading-none md:text-[clamp(1.85rem,3.2vw,3.25rem)]">Step 1: Group Picks</h2>
          <p className="bracket-stage-copy mt-2 max-w-3xl text-xs font-semibold leading-5 text-muted-foreground md:mt-3 md:text-sm md:leading-6">
            {locked && !allGroupsSaved
              ? "Group rankings are closed, but you can still make Top 8 and future bracket predictions. No unsaved group order will be scored."
              : "Move teams into your predicted order. Save each group on its own so every group gets its own locked scoring timestamp."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-trophy-gold/20 bg-trophy-gold/10 p-2.5 md:p-3">
              <div className="mb-1 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-trophy-gold">
                <Clock className="size-4" />
                {locked ? "Group rankings locked" : "Group rankings lock in"}
              </div>
              <p className="font-mono text-xl font-black text-trophy-gold">{locked ? "Locked" : formatCountdown(groupCutoffAt, nowMs)}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatDateTime(groupCutoffAt)}</p>
            </div>
            <div className="rounded-xl border border-electric/20 bg-electric/10 p-2.5 md:p-3">
              <div className="mb-1 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-electric">
                {top8Open ? <ShieldCheck className="size-4" /> : <Lock className="size-4" />}
                Top 8 gate
              </div>
              <p className="font-mono text-xl font-black text-electric">
                {top8Open ? "Open" : top8Locked ? "Locked" : formatCountdown(top8OpenAt, nowMs)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {top8Open ? "You can continue now" : top8Locked ? "Window closed" : `Opens ${formatDateTime(top8OpenAt)}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onContinue} disabled={continueLocked} className="min-h-10 md:min-h-12">
            {continueLabel}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="bracket-groups-grid grid grid-flow-dense gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map((group) => {
          const letter = groupLetter(group.groupName);
          const ranking = groupRankings[letter] ?? group.teams.map((team) => team.id);
          const pointWindow = resolveGroupPointWindow(groupPointValues[letter], nowMs, locked);
          const groupSavedAt = groupSavedAtByLetter[letter] ?? null;
          const editingSavedGroup = groupEditUnlockedLetters.has(letter);
          const groupEditLocked = locked || Boolean(groupSavedAt && !editingSavedGroup);
          return (
            <article
              key={letter}
              className="bracket-group-card-live rounded-xl border border-white/10 bg-navy-950/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] md:p-3"
            >
              <div className="bracket-card-header mb-2 flex items-center justify-between gap-2 md:mb-3 md:gap-3">
                <div>
                  <p className="text-base font-black md:text-lg">Group {letter}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Top two advance</p>
                  <p
                    className={cn(
                      "mt-1 truncate text-[0.62rem] font-black uppercase tracking-[0.1em]",
                      groupSavedAt ? "text-pitch-green" : "text-white/32",
                    )}
                    title={
                      groupSavedAt
                        ? "This is the stored scoring timestamp for this group. Unchanged groups keep their original timestamp when you save again."
                        : "This group has not been saved for scoring yet."
                    }
                  >
                    {groupSavedAt ? `Last saved ${formatCompactDateTime(groupSavedAt)}` : "Not saved yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <GroupAuditButton
                    group={letter}
                    ranking={ranking}
                    teamsById={teamsById}
                    savedAt={groupSavedAt}
                    audit={audit?.groups?.[letter] ?? null}
                  />
                  <span className="bracket-count-pill rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 font-mono text-xs font-black">
                    {ranking.length}/4
                  </span>
                  {groupSavedAt && !editingSavedGroup ? (
                    <Button type="button" size="sm" variant="secondary" disabled={locked} onClick={() => onUnlockGroup(letter)} className="h-8 rounded-lg px-2 text-[0.62rem]">
                      <Lock className="size-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <Button type="button" size="sm" disabled={locked || ranking.length !== 4} onClick={() => onSaveGroup(letter)} className="h-8 rounded-lg px-2 text-[0.62rem]">
                      <Save className="size-3.5" />
                      {groupSavedAt ? "Re-save" : "Save"}
                    </Button>
                  )}
                </div>
              </div>
              {groupSavedAt && !editingSavedGroup ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-pitch-green/20 bg-pitch-green/10 px-2.5 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-pitch-green">
                  <Check className="size-3.5" />
                  Saved and locked
                </div>
              ) : editingSavedGroup ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-trophy-gold/25 bg-trophy-gold/10 px-2.5 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-trophy-gold">
                  <AlertTriangle className="size-3.5" />
                  Editing saved group
                </div>
              ) : null}
              <GroupPointsWindow
                values={pointWindow.values}
                nextDropAt={pointWindow.nextDropAt}
                locked={groupEditLocked}
                nowMs={nowMs}
              />
              <div className="grid gap-1.5">
                {ranking.map((teamId, index) => {
                  const team = teamsById.get(teamId);
                  if (!team) return null;
                  return (
                    <GroupTeamRow
                      key={team.id}
                      group={letter}
                      team={team}
                      rank={index + 1}
                      locked={groupEditLocked}
                      onMoveTeam={onMoveTeam}
                      draggingTeamId={draggingTeamId}
                      dropTargetTeamId={dropTargetTeamId}
                      onStartTeamDrag={onStartTeamDrag}
                      onDropTeam={onDropTeam}
                    />
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GroupAuditButton({
  group,
  ranking,
  teamsById,
  savedAt,
  audit,
}: {
  group: string;
  ranking: number[];
  teamsById: Map<number, PredictorTeam>;
  savedAt: string | null;
  audit: BracketGroupAudit | null;
}) {
  const released = Boolean(audit?.released);
  const rows = [0, 1, 2].map((index) => {
    const reason = groupAuditReasonForPosition(audit?.reasons ?? [], index);
    const reasonPoints = reason?.points ?? 0;
    return {
      rank: index + 1,
      pick: teamsById.get(ranking[index] ?? 0) ?? null,
      actual: released ? teamsById.get(audit?.actualTeamIds[index] ?? 0) ?? null : null,
      points: released ? reasonPoints : null,
      hit: released && Number(reasonPoints) > 0,
    };
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="secondary"
          className="h-8 w-8 rounded-lg border-trophy-gold/25 bg-trophy-gold/10 text-trophy-gold hover:bg-trophy-gold/15"
          aria-label={`Open Group ${group} points audit`}
          title={`Group ${group} points audit`}
        >
          <Info className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="wc-kit-dialog max-h-[88dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border border-trophy-gold/20 bg-[#071126] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:max-w-xl"
        aria-describedby={`group-${group}-audit-description`}
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Info className="size-5 text-trophy-gold" />
            Group {group} audit
          </DialogTitle>
          <DialogDescription id={`group-${group}-audit-description`} className="text-sm font-semibold leading-6 text-white/52">
            Your saved group order, official finish, and points once that group has released.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68dvh] overflow-y-auto px-4 py-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <AuditMetric label="Status" value={released ? "Released" : "Pending"} tone={released ? "green" : "muted"} />
            <AuditMetric label="Points" value={released ? signedAuditPoints(audit?.points) : "--"} tone="gold" />
            <AuditMetric label="Saved" value={savedAt ? formatCompactDateTime(savedAt) : "Not saved"} />
          </div>
          {audit?.source ? <AuditSourceNote source={audit.source} /> : null}

          <div className="grid gap-1.5">
            {rows.map((row) => (
              <div key={row.rank} className="grid min-h-14 grid-cols-[1.7rem_minmax(0,1fr)_minmax(0,1fr)_2.7rem] items-center gap-1.5 rounded-lg border border-white/10 bg-navy-950/55 px-2 py-1.5">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-md border font-mono text-xs font-black",
                    row.hit ? "border-pitch-green/30 bg-pitch-green/10 text-pitch-green" : "border-white/10 bg-white/[0.045] text-muted-foreground",
                  )}
                >
                  {row.rank}
                </span>
                <AuditTeamCell label="Pick" team={row.pick} fallback="Pick" />
                <AuditTeamCell label="Actual" team={row.actual} fallback={released ? "TBD" : "Hidden"} muted={!released} />
                <span className={cn("text-right font-mono text-sm font-black", row.hit ? "text-trophy-gold" : "text-white/34")}>
                  {released ? signedAuditPoints(row.points) : "--"}
                </span>
              </div>
            ))}
          </div>

          <AuditReasonList reasons={audit?.reasons ?? []} empty={released ? "No scoring reasons for this group." : "Official group points have not released yet."} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Top8AuditButton({
  top8TeamIds,
  teamsById,
  teamGroupById,
  savedAt,
  savedAtByGroup,
  top8LockAt,
  audit,
}: {
  top8TeamIds: number[];
  teamsById: Map<number, PredictorTeam>;
  teamGroupById: Map<number, string>;
  savedAt: string | null;
  savedAtByGroup: Record<string, string | null>;
  top8LockAt: string;
  audit: BracketTop8Audit | null;
}) {
  const released = Boolean(audit?.released);
  const actualSet = new Set(audit?.actualTeamIds ?? []);
  const hasStoredPickDetails = (audit?.pickDetails.length ?? 0) > 0;
  const pickDetailByTeamId = new Map((audit?.pickDetails ?? []).map((detail) => [detail.teamId, detail]));
  const picks = top8TeamIds
    .map((teamId) => {
      const team = teamsById.get(teamId) ?? null;
      const group = teamGroupById.get(teamId) ?? null;
      const detail = pickDetailByTeamId.get(teamId) ?? null;
      const pickSavedAt = detail?.savedAt ?? (group ? savedAtByGroup[group] ?? savedAt : savedAt);
      const source = group ? audit?.sourcesByGroup?.[group] ?? null : null;
      const resolvedSavedAt = pickSavedAt ?? source?.savedAt ?? null;
      const fallbackTiming = released && !detail ? resolveTop8PickPoints(resolvedSavedAt, top8LockAt) : null;
      return team ? { team, group, savedAt: resolvedSavedAt, detail, fallbackTiming, source } : null;
    })
    .filter((pick): pick is { team: PredictorTeam; group: string | null; savedAt: string | null; detail: BracketTop8Audit["pickDetails"][number] | null; fallbackTiming: ReturnType<typeof resolveTop8PickPoints> | null; source: DefaultPickSource | null } => Boolean(pick))
    .sort((a, b) => (a.group ?? "Z").localeCompare(b.group ?? "Z"));
  const fallbackBasePoints = released
    ? picks.reduce((sum, pick) => {
        const correct = pick.detail?.correct ?? actualSet.has(pick.team.id);
        return sum + (correct && pick.fallbackTiming?.eligible ? pick.fallbackTiming.pointsPerCorrectTeam : 0);
      }, 0)
    : 0;
  const fallbackPerfectBonus =
    released &&
    picks.length === 8 &&
    picks.every((pick) => {
      const correct = pick.detail?.correct ?? actualSet.has(pick.team.id);
      const eligible = pick.detail ? pick.detail.eligible !== false : Boolean(pick.fallbackTiming?.eligible);
      return correct && eligible;
    })
      ? TOP8_PERFECT_BONUS_POINTS
      : 0;
  const displayedPoints = released && !hasStoredPickDetails ? fallbackBasePoints + fallbackPerfectBonus : audit?.points;
  const displayedPerfectBonus = released && !hasStoredPickDetails ? fallbackPerfectBonus : audit?.perfectBonus;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 rounded-lg border-trophy-gold/25 bg-trophy-gold/10 px-2 text-[0.66rem] text-trophy-gold hover:bg-trophy-gold/15"
        >
          <Info className="size-3.5" />
          Audit
        </Button>
      </DialogTrigger>
      <DialogContent
        className="wc-kit-dialog max-h-[88dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden border border-trophy-gold/20 bg-[#071126] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:max-w-2xl"
        aria-describedby="top8-audit-description"
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Trophy className="size-5 text-trophy-gold" />
            Top 8 audit
          </DialogTitle>
          <DialogDescription id="top8-audit-description" className="text-sm font-semibold leading-6 text-white/52">
            Your saved third-place picks with saved time, correctness, and points once Top 8 scoring releases.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68dvh] overflow-y-auto px-4 py-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <AuditMetric label="Status" value={released ? "Released" : "Pending"} tone={released ? "green" : "muted"} />
            <AuditMetric label="Points" value={released ? signedAuditPoints(displayedPoints) : "--"} tone="gold" />
            <AuditMetric label="Perfect" value={released ? signedAuditPoints(displayedPerfectBonus) : "--"} />
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {picks.length > 0 ? (
              picks.map((pick) => {
                const correct = released ? pick.detail?.correct ?? actualSet.has(pick.team.id) : null;
                const points = released ? pick.detail?.points ?? (correct && pick.fallbackTiming?.eligible ? pick.fallbackTiming.pointsPerCorrectTeam : 0) : null;
                return (
                  <div
                    key={pick.team.id}
                    className={cn(
                      "grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_3.2rem] items-center gap-2 rounded-lg border px-2 py-1.5",
                      correct ? "border-pitch-green/25 bg-pitch-green/10" : "border-white/10 bg-navy-950/55",
                    )}
                  >
                    <TeamFlag team={pick.team} fallback={pick.team.code ?? "TBD"} className="bracket-team-mark rounded-md" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-white">{pick.team.name}</span>
                      <span className="block truncate text-[0.62rem] font-bold text-white/42" title={pick.savedAt ? `Saved ${formatDateTime(pick.savedAt)}` : "No saved timestamp"}>
                        {pick.group ? `Group ${pick.group}` : "Group pending"} / {pick.savedAt ? `Saved ${formatCompactDateTime(pick.savedAt)}` : "Not saved"}
                      </span>
                      {pick.source ? <AuditSourcePill source={pick.source} /> : null}
                    </span>
                    <span className={cn("text-right font-mono text-sm font-black", correct ? "text-trophy-gold" : "text-white/34")}>
                      {released ? signedAuditPoints(points) : "--"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-white/10 bg-navy-950/55 p-3 text-sm font-semibold text-white/46 sm:col-span-2">No Top 8 picks saved yet.</p>
            )}
          </div>

          <AuditReasonList reasons={audit?.reasons ?? []} empty={released ? "No Top 8 scoring reasons yet." : "Top 8 points release after all group standings are final."} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuditSourceNote({ source }: { source: DefaultPickSource }) {
  return (
    <div
      className={cn(
        "mb-3 rounded-lg border px-3 py-2 text-xs font-semibold leading-5",
        source.kind === "autosaved" ? "border-electric/25 bg-electric/10 text-electric" : "border-trophy-gold/25 bg-trophy-gold/10 text-trophy-gold",
      )}
    >
      <span className="font-black uppercase tracking-[0.1em]">{source.label}</span>
      <span className="text-white/58"> · {source.explanation}</span>
    </div>
  );
}

function AuditSourcePill({ source }: { source: DefaultPickSource }) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex max-w-full rounded-full border px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.08em]",
        source.kind === "autosaved" ? "border-electric/24 bg-electric/10 text-electric" : "border-trophy-gold/28 bg-trophy-gold/10 text-trophy-gold",
      )}
      title={source.explanation}
    >
      {source.label}
    </span>
  );
}

function AuditMetric({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "gold" | "green" }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-white/[0.045] px-2.5 py-2",
        tone === "gold" && "border-trophy-gold/20 bg-trophy-gold/10",
        tone === "green" && "border-pitch-green/20 bg-pitch-green/10",
        tone === "muted" && "border-white/10",
      )}
    >
      <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-sm font-black", tone === "gold" ? "text-trophy-gold" : tone === "green" ? "text-pitch-green" : "text-white")}>{value}</p>
    </div>
  );
}

function AuditTeamCell({ label, team, fallback, muted = false }: { label: string; team: PredictorTeam | null; fallback: string; muted?: boolean }) {
  return (
    <span className={cn("grid min-w-0 grid-cols-[2.15rem_minmax(0,1fr)] items-center gap-1.5", muted && "opacity-55")}>
      <TeamFlag team={team} fallback={fallback} className="bracket-team-mark rounded-md" />
      <span className="min-w-0">
        <span className="block truncate text-[0.54rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <span className="block truncate text-xs font-black text-white">{team?.code ?? team?.name ?? fallback}</span>
      </span>
    </span>
  );
}

function AuditReasonList({ reasons, empty }: { reasons: BracketAuditReason[]; empty: string }) {
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-muted-foreground">Scoring reasons</p>
      {reasons.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {reasons.map((reason, index) => (
            <div key={`${reason.code ?? "reason"}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs font-semibold text-white/58">
              <span className="min-w-0 truncate">{reason.description ?? reason.code ?? "Scored item"}</span>
              <span className="font-mono font-black text-trophy-gold">{signedAuditPoints(reason.points)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold leading-5 text-white/42">{empty}</p>
      )}
    </div>
  );
}

function GroupPointsWindow({
  values,
  nextDropAt,
  locked,
  nowMs,
}: {
  values: { first: number; second: number; third: number };
  nextDropAt: string | null;
  locked: boolean;
  nowMs: number;
}) {
  const statusLabel = locked ? "Locked" : nextDropAt ? `Drops in ${formatCountdown(nextDropAt, nowMs)}` : "No more drops";
  const statusDetail = locked
    ? "Final values saved"
    : nextDropAt
      ? `Drop: ${formatCompactDateTime(nextDropAt)}`
      : "Lowest value until lock";

  return (
    <div className="mb-2 rounded-lg border border-trophy-gold/20 bg-[linear-gradient(135deg,rgba(214,178,96,0.13),rgba(91,108,255,0.06))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] md:mb-3 md:p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-trophy-gold">Available now</p>
          <p className="mt-0.5 truncate text-[0.64rem] font-bold text-muted-foreground">{statusDetail}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[0.58rem] font-black uppercase leading-none",
            locked
              ? "border-white/10 bg-white/[0.045] text-muted-foreground"
              : nextDropAt
                ? "border-trophy-gold/30 bg-trophy-gold/12 text-trophy-gold"
                : "border-pitch-green/25 bg-pitch-green/10 text-pitch-green",
          )}
        >
          <Clock className="size-3" />
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          ["1st", values.first],
          ["2nd", values.second],
          ["3rd", values.third],
        ].map(([label, value]) => (
          <span key={label} className="rounded-md border border-white/10 bg-navy-950/45 px-2 py-1.5">
            <span className="block text-[0.56rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
            <span className="block font-mono text-sm font-black leading-tight text-trophy-gold">+{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function GroupTeamRow({
  group,
  team,
  rank,
  locked,
  onMoveTeam,
  draggingTeamId,
  dropTargetTeamId,
  onStartTeamDrag,
  onDropTeam,
}: {
  group: string;
  team: PredictorTeam;
  rank: number;
  locked: boolean;
  onMoveTeam: (group: string, teamId: number, direction: -1 | 1) => void;
  draggingTeamId: number | null;
  dropTargetTeamId: number | null;
  onStartTeamDrag: (group: string, teamId: number, pointer?: { x: number; y: number }) => void;
  onDropTeam: (group: string, targetTeamId: number) => void;
}) {
  const canDrag = !locked;
  const isDragging = draggingTeamId === team.id;
  const isDropTarget = dropTargetTeamId === team.id;

  return (
    <div
      role={canDrag ? "button" : undefined}
      tabIndex={canDrag ? 0 : undefined}
      data-bracket-group={group}
      data-bracket-team-id={team.id}
      aria-label={
        canDrag
          ? `Drag ${team.name} to reorder Group ${group}. Use arrow keys to move the team.`
          : `${team.name} is ranked ${rank} in Group ${group}`
      }
      onPointerDown={(event) => {
        if (!canDrag || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onStartTeamDrag(group, team.id, { x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        if (!canDrag) return;
        if ((event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") && rank > 1) {
          event.preventDefault();
          onMoveTeam(group, team.id, -1);
        }
        if (event.key === "ArrowDown" && rank < 4) {
          event.preventDefault();
          onMoveTeam(group, team.id, 1);
        }
      }}
      className={cn(
        "bracket-team-row grid min-h-10 grid-cols-[1.75rem_minmax(0,1fr)_3.8rem] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-1.5 md:min-h-11 md:grid-cols-[2rem_minmax(0,1fr)_4.35rem] md:gap-2",
        canDrag ? "is-draggable" : "is-still",
        isDragging && "is-dragging",
        isDropTarget && "is-drop-target",
      )}
    >
      <span
        className={cn(
          "bracket-rank-badge grid size-7 place-items-center rounded-md font-mono text-xs font-black md:size-8",
          rank === 1
            ? "is-first"
            : rank === 2
              ? "is-second"
              : rank === 3
                ? "is-third"
                : "is-out bg-white/[0.05] text-muted-foreground",
        )}
        style={getRankBadgeStyle(rank)}
      >
        {rank}
      </span>
      <span className="bracket-team-copy flex min-w-0 items-center gap-1.5 md:gap-2">
        <InlineTeamFlag team={team} />
        <span className="min-w-0">
          <span className="block truncate text-xs font-black md:text-sm">{team.name}</span>
          <span className="block truncate text-[0.68rem] font-semibold text-muted-foreground">
            {rank <= 2 ? "Auto-qualifier" : rank === 3 ? "Third candidate" : "Out"}
          </span>
        </span>
      </span>
      <span className="flex justify-end gap-1">
        <button
          type="button"
          aria-label={`Move ${team.name} up`}
          disabled={!canDrag || rank <= 1}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (canDrag && rank > 1) onMoveTeam(group, team.id, -1);
          }}
          className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${team.name} down`}
          disabled={!canDrag || rank >= 4}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (canDrag && rank < 4) onMoveTeam(group, team.id, 1);
          }}
          className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronDown className="size-4" />
        </button>
      </span>
    </div>
  );
}

function DragTeamPreview({ team, rank, pointer }: { team: PredictorTeam; rank: number; pointer: { x: number; y: number } }) {
  return (
    <div className="bracket-drag-preview" style={{ transform: `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)` }}>
      <span className="bracket-rank-badge is-drag-preview grid size-8 place-items-center rounded-md font-mono text-xs font-black">
        {rank > 0 ? rank : ""}
      </span>
      <TeamFlag team={team} fallback={team.code ?? "TBD"} className="bracket-drag-preview-flag" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{team.name}</span>
        <span className="block truncate text-[0.66rem] font-bold text-trophy-gold">Reordering group</span>
      </span>
    </div>
  );
}

function InlineTeamFlag({ team }: { team: PredictorTeam }) {
  return <TeamFlag team={team} fallback={team.code?.slice(0, 3) ?? "TBD"} className="bracket-flag-inline" />;
}

function TeamFlag({ team, fallback, className }: { team: PredictorTeam | null; fallback: string; className?: string }) {
  const flagPath = team ? getWorldCupTeamFlagPath({ name: team.name, country: team.country, code: team.code }) ?? team.logoUrl : null;
  const flagStyle = getTeamFlagStyle(className);

  return (
    <span
      className={cn("bracket-team-flag grid place-items-center overflow-hidden border border-white/10 bg-white/[0.055] text-[0.5rem] font-black text-muted-foreground", className)}
      style={flagStyle}
    >
      {flagPath ? (
        <img
          src={flagPath}
          alt=""
          className="object-cover object-center"
          style={{
            display: "block",
            height: "100%",
            maxHeight: "none",
            maxWidth: "none",
            minHeight: "100%",
            minWidth: "100%",
            objectFit: "cover",
            objectPosition: "center",
            width: "100%",
          }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

function getTeamFlagStyle(className?: string): CSSProperties | undefined {
  if (!className) return undefined;
  if (className.includes("bracket-flag-inline")) {
    return { width: "2.15rem", minWidth: "2.15rem", maxWidth: "2.15rem", height: "1.43rem", minHeight: "1.43rem", maxHeight: "1.43rem" };
  }
  if (className.includes("bracket-team-mark")) return { width: "2.15rem", height: "1.43rem" };
  if (className.includes("bracket-third-flag")) return { width: "3.9rem", height: "2.6rem" };
  if (className.includes("bracket-drag-preview-flag")) return { width: "2.65rem", height: "1.77rem" };
  return undefined;
}

function getRankBadgeStyle(rank: number): CSSProperties | undefined {
  if (rank === 1) {
    return {
      background: "radial-gradient(circle at 45% 18%, rgba(255, 244, 184, 0.28), transparent 58%), linear-gradient(180deg, rgba(214, 178, 96, 0.34), rgba(119, 87, 34, 0.28))",
      borderColor: "rgba(246, 213, 126, 0.42)",
      boxShadow: "0 0 0 1px rgba(246, 213, 126, 0.12), 0 0 18px rgba(214, 178, 96, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
      color: "#ffe08a",
      textShadow: "0 0 12px rgba(255, 225, 135, 0.52)",
    };
  }

  if (rank === 2) {
    return {
      background: "radial-gradient(circle at 45% 18%, rgba(201, 255, 155, 0.22), transparent 58%), linear-gradient(180deg, rgba(164, 223, 112, 0.24), rgba(47, 82, 54, 0.32))",
      borderColor: "rgba(164, 223, 112, 0.34)",
      boxShadow: "0 0 0 1px rgba(164, 223, 112, 0.1), 0 0 16px rgba(164, 223, 112, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
      color: "#bff192",
      textShadow: "0 0 12px rgba(186, 239, 139, 0.42)",
    };
  }

  if (rank === 3) {
    return {
      background: "radial-gradient(circle at 45% 18%, rgba(250, 193, 119, 0.2), transparent 58%), linear-gradient(180deg, rgba(169, 116, 62, 0.28), rgba(91, 66, 45, 0.32))",
      borderColor: "rgba(210, 150, 83, 0.36)",
      boxShadow: "0 0 0 1px rgba(210, 150, 83, 0.1), 0 0 16px rgba(210, 150, 83, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      color: "#e3b173",
      textShadow: "0 0 12px rgba(226, 172, 104, 0.36)",
    };
  }

  return undefined;
}

function ThirdsSetupStage({
  groups,
  teamsById,
  teamGroupById,
  top8TeamIds,
  top8DirectSaved,
  top8SavedAt,
  top8GroupSavedAtByLetter,
  audit,
  thirdPlaceGroups,
  thirdPlaceSlotGroups,
  top8Open,
  top8Locked,
  top8OpenAt,
  top8LockAt,
  nowMs,
  knockoutOpen,
  knockoutOpenAt,
  knockoutLocked,
  busy,
  onToggleTeam,
  onBack,
  onContinue,
  onSave,
  onSaveGroup,
  onUnsaveGroup,
}: {
  groups: PredictorGroup[];
  teamsById: Map<number, PredictorTeam>;
  teamGroupById: Map<number, string>;
  top8TeamIds: number[];
  top8DirectSaved: boolean;
  top8SavedAt: string | null;
  top8GroupSavedAtByLetter: Record<string, string | null>;
  audit?: BracketTop8Audit | null;
  thirdPlaceGroups: string[];
  thirdPlaceSlotGroups: Record<string, string>;
  top8Open: boolean;
  top8Locked: boolean;
  top8OpenAt: string;
  top8LockAt: string;
  nowMs: number;
  knockoutOpen: boolean;
  knockoutOpenAt: string;
  knockoutLocked: boolean;
  busy: boolean;
  onToggleTeam: (team: PredictorTeam) => void;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  onSaveGroup: (group: string) => void;
  onUnsaveGroup: (group: string) => void;
}) {
  const ready = top8TeamIds.length === 8;
  const selectedTeamIds = new Set(top8TeamIds);
  const selectedGroups = new Set(thirdPlaceGroups);
  const savedTop8GroupCount = top8TeamIds.filter((teamId) => {
    const group = teamGroupById.get(teamId);
    return Boolean(group && top8GroupSavedAtByLetter[group]);
  }).length;
  const needsDirectResave = ready && !top8DirectSaved;
  const hasTop8Draft = top8TeamIds.length > 0;
  const top8SaveLabel =
    top8DirectSaved && top8SavedAt
      ? `Top 8 saved ${formatCompactDateTime(top8SavedAt)}`
      : top8DirectSaved
        ? "Saved - re-save to stamp time"
        : savedTop8GroupCount > 0
          ? `${savedTop8GroupCount}/8 saved`
        : hasTop8Draft
          ? "Draft not saved"
          : "Not saved yet";
  const top8SavedAtLine = top8DirectSaved && top8SavedAt
    ? `Saved at ${formatDateTime(top8SavedAt)}`
    : top8DirectSaved
      ? "Saved pick has no timestamp yet. Press Re-save Top 8 to stamp it."
      : savedTop8GroupCount > 0
        ? `${savedTop8GroupCount} groups saved. Save all eight for scoring.`
        : hasTop8Draft
          ? "Draft picks are not saved yet."
          : "No Top 8 save yet.";
  const top8SaveTitle =
    top8DirectSaved && top8SavedAt
      ? `Stored Top 8 scoring timestamp: ${formatDateTime(top8SavedAt)}`
      : top8DirectSaved
        ? "Top 8 is saved, but the timestamp is pending from the server."
        : "Top 8 choices need to be saved before lock to count.";
  const top8TeamIdByGroup = new Map(
    top8TeamIds
      .map((teamId) => {
        const group = teamGroupById.get(teamId);
        return group ? [group, teamId] : null;
      })
      .filter((entry): entry is [string, number] => Boolean(entry)),
  );
  const statusLabel = top8Open ? `Locks in ${formatCountdown(top8LockAt, nowMs)}` : top8Locked ? "Locked" : `Opens in ${formatCountdown(top8OpenAt, nowMs)}`;
  const statusDetail = top8Open ? `Window closes ${formatDateTime(top8LockAt)}` : top8Locked ? `Closed ${formatDateTime(top8LockAt)}` : `Opens ${formatDateTime(top8OpenAt)}`;
  const bracketContinueLabel = knockoutLocked
    ? "Bracket locked"
    : knockoutOpen
      ? "Continue to bracket"
      : `Bracket opens in ${formatCountdown(knockoutOpenAt, nowMs)}`;
  const timingRows = [
    ["Open", "Jun 18, 10:00 AM", "+9"],
    ["Jun 20", "10:00 AM", "+8"],
    ["Jun 22", "10:00 AM", "+6"],
    ["Jun 23", "10:00 AM", "+4"],
    ["Jun 24", "Before 3:00 PM", "+3"],
    ["Lock", "Jun 24, 3:00 PM", "+0"],
  ] as const;

  return (
    <section className="bracket-thirds-layout grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="bracket-stage-card bracket-thirds-stage premium-card p-3 md:p-5">
        <div className="bracket-stage-heading mb-3 grid gap-3 md:mb-5 md:gap-4">
          <div>
            <div className="bracket-stage-kicker is-gold mb-2 inline-flex items-center gap-2 rounded-lg border border-trophy-gold/25 bg-trophy-gold/10 px-2.5 py-1.5 text-[0.7rem] font-black uppercase text-trophy-gold md:mb-3 md:px-3 md:py-2 md:text-xs">
              <Trophy className="size-4" />
              Then choose eight
            </div>
            <h2 className="bracket-stage-title text-[clamp(1.45rem,7vw,2rem)] font-black leading-none md:text-[clamp(1.85rem,3.2vw,3.25rem)]">Select the Top 8 third-place teams</h2>
            <p className="bracket-stage-copy mt-2 max-w-3xl text-xs font-semibold leading-5 text-muted-foreground md:mt-3 md:text-sm md:leading-6">
              {top8Open
                ? "Top 8 is open. Make your Top 8 predictions before June 24 at 3:00 PM. This is separate from your locked group order; only one team per group can be selected."
                : top8Locked
                  ? "Top 8 scoring is locked. You can review saved picks here, but new Top 8 saves no longer score."
                  : `Top 8 opens ${formatDateTime(top8OpenAt)}. This step is separate from your group order, and only one team per group can be selected.`}
            </p>
            <div className="mt-3 inline-flex w-full rounded-xl border border-trophy-gold/20 bg-trophy-gold/10 px-2.5 py-2 md:w-auto md:min-w-[15rem] md:px-3">
              <div>
                <p className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-trophy-gold">Top 8 timer</p>
                <p className="mt-1 font-mono text-lg font-black text-trophy-gold">{statusLabel}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{statusDetail}</p>
                <p
                  className={cn(
                    "mt-2 rounded-lg border px-2 py-1.5 text-xs font-black",
                    top8DirectSaved ? "border-pitch-green/25 bg-pitch-green/10 text-pitch-green" : hasTop8Draft ? "border-trophy-gold/25 bg-trophy-gold/10 text-trophy-gold" : "border-white/10 bg-white/[0.045] text-muted-foreground",
                  )}
                  title={top8SaveTitle}
                >
                  {top8SavedAtLine}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBack}>
              Back to groups
            </Button>
            <Button variant="secondary" onClick={onSave} disabled={busy || !ready || !top8Open}>
              <Save className="size-4" />
              {top8DirectSaved ? "Re-save Top 8" : "Save direct Top 8"}
            </Button>
            <Button onClick={onContinue} disabled={!ready || !knockoutOpen || knockoutLocked} title={knockoutOpen ? undefined : `Round of 32 opens ${formatDateTime(knockoutOpenAt)}`}>
              {bracketContinueLabel}
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.1em]",
                top8DirectSaved ? "border-pitch-green/25 bg-pitch-green/10 text-pitch-green" : hasTop8Draft ? "border-trophy-gold/25 bg-trophy-gold/10 text-trophy-gold" : "border-white/10 bg-white/[0.045] text-muted-foreground",
              )}
              title={top8SaveTitle}
            >
              {top8DirectSaved ? <Check className="size-3.5" /> : <Clock className="size-3.5" />}
              {top8SaveLabel}
            </span>
            <Top8AuditButton
              top8TeamIds={top8TeamIds}
              teamsById={teamsById}
              teamGroupById={teamGroupById}
              savedAt={top8SavedAt}
              savedAtByGroup={top8GroupSavedAtByLetter}
              top8LockAt={top8LockAt}
              audit={audit ?? null}
            />
          </div>
        </div>

        {needsDirectResave ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-trophy-gold/30 bg-trophy-gold/10 p-3 text-sm font-semibold leading-5 text-trophy-gold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>These are draft Top 8 choices. Press Save direct Top 8 before lock so they count for scoring.</span>
          </div>
        ) : null}

        <div className="bracket-top8-groups grid gap-2.5 md:gap-3 xl:grid-cols-2">
          {groups.map((group) => {
            const letter = groupLetter(group.groupName);
            const groupHasSelection = selectedGroups.has(letter);
            const selectedTeamId = top8TeamIdByGroup.get(letter) ?? null;
            const groupSavedAt = selectedTeamId ? (top8GroupSavedAtByLetter[letter] ?? null) : null;
            const groupIsSaved = Boolean(groupSavedAt);
            const groupSaveTitle = groupIsSaved
              ? `Group ${letter} Top 8 timestamp: ${formatDateTime(groupSavedAt)}`
              : groupHasSelection
                ? `Group ${letter} Top 8 pick is a draft until saved.`
                : `Pick one Group ${letter} team before saving.`;
            const groupSavedAtLine = groupIsSaved
              ? `Saved ${formatCompactDateTime(groupSavedAt)}`
              : groupHasSelection
                ? "Draft pick is not saved yet."
                : "Choose one team before saving.";
            return (
              <article key={letter} className="rounded-xl border border-white/10 bg-navy-950/40 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-foreground">Group {letter}</p>
                    <p className="text-[0.68rem] font-semibold text-muted-foreground">Choose at most one</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.09em]",
                      groupHasSelection ? "border-pitch-green/30 bg-pitch-green/10 text-pitch-green" : "border-white/10 bg-white/[0.045] text-muted-foreground",
                    )}
                  >
                    {groupHasSelection ? "Selected" : "Open"}
                  </span>
                </div>
                <div
                  className={cn(
                    "mb-2 rounded-lg border px-2.5 py-2",
                    groupIsSaved
                      ? "border-pitch-green/20 bg-pitch-green/10"
                      : groupHasSelection
                        ? "border-trophy-gold/20 bg-trophy-gold/10"
                        : "border-white/10 bg-white/[0.045]",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-muted-foreground">Top 8 save</p>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-[0.68rem] font-black",
                          groupIsSaved ? "text-pitch-green" : groupHasSelection ? "text-trophy-gold" : "text-muted-foreground",
                        )}
                        title={groupSaveTitle}
                      >
                        {groupSavedAtLine}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button type="button" size="sm" variant="secondary" onClick={() => onSaveGroup(letter)} disabled={busy || !groupHasSelection || !top8Open} className="h-8 rounded-lg px-2 text-[0.62rem]">
                        <Save className="size-3.5" />
                        {groupIsSaved ? "Saved" : "Save"}
                      </Button>
                      {groupHasSelection ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => onUnsaveGroup(letter)} disabled={busy || !top8Open} className="h-8 rounded-lg px-2 text-[0.62rem]">
                          <RotateCcw className="size-3.5" />
                          Unsave
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.teams.map((team) => {
                    const selected = selectedTeamIds.has(team.id);
                    const blocked = groupHasSelection && !selected;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "bracket-third-chip grid min-h-16 grid-cols-[3.95rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-xl border p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition active:translate-y-px md:grid-cols-[4.1rem_minmax(0,1fr)_1.5rem]",
                          selected
                            ? "is-selected border-pitch-green/45 bg-pitch-green/12 text-foreground"
                            : "border-white/10 bg-white/[0.045] text-muted-foreground hover:border-white/20 hover:bg-white/[0.065] hover:text-foreground",
                          blocked && "opacity-55",
                        )}
                        onClick={() => onToggleTeam(team)}
                        disabled={!top8Open}
                      >
                        <span className="bracket-third-flag-wrap relative grid h-[2.6rem] w-[3.9rem] place-items-center overflow-hidden rounded-lg border border-white/10 bg-navy-950/55 p-0">
                          <TeamFlag team={team} fallback={letter} className="bracket-third-flag" />
                          <span className="bracket-third-letter absolute -left-1 -top-1 grid size-5 place-items-center rounded-md border border-white/10 bg-navy-950/90 font-mono text-[0.62rem] font-black">
                            {letter}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{team.name}</span>
                          <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">
                            {selected ? "Top 8 pick" : blocked ? "Group already picked" : "Available"}
                          </span>
                        </span>
                        {selected ? <Check className="size-5 text-pitch-green" /> : <Circle className="size-5 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="bracket-side-panel self-start premium-card p-3 md:p-4 xl:sticky xl:top-6">
        <div className="bracket-status-card rounded-xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center gap-3">
            {ready ? <ShieldCheck className="size-5 text-pitch-green" /> : <AlertTriangle className="size-5 text-trophy-gold" />}
            <div>
              <p className="text-xl font-black">{top8TeamIds.length}/8 selected</p>
              <p className="text-xs font-semibold text-muted-foreground">{statusDetail}</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
            Scoring is strict: a pick scores only if that team finishes third and is one of the eight best third-place qualifiers.
          </p>
          <p
            className={cn(
              "mt-3 rounded-lg border px-2.5 py-2 text-xs font-black uppercase tracking-[0.1em]",
              top8DirectSaved ? "border-pitch-green/20 bg-pitch-green/10 text-pitch-green" : hasTop8Draft ? "border-trophy-gold/20 bg-trophy-gold/10 text-trophy-gold" : "border-white/10 bg-white/[0.045] text-muted-foreground",
            )}
            title={top8SaveTitle}
          >
            {top8SaveLabel}
          </p>
        </div>

        <div className="bracket-slot-map mt-4 rounded-xl border border-electric/20 bg-electric/10 p-4">
          <p className="mb-3 text-sm font-black">Round of 32 placement</p>
          {ready ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(thirdPlaceSlotGroups).map(([matchNo, group]) => {
                const team = teamsById.get(top8TeamIdByGroup.get(group) ?? 0) ?? null;
                return (
                <span key={matchNo} className="rounded-lg border border-white/10 bg-navy-950/50 px-2 py-2 font-mono text-xs font-black">
                  M{matchNo}: {team?.code ?? `3${group}`}
                </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              The slot map appears after the eighth third-place team is selected.
            </p>
          )}
        </div>

        <div className="bracket-slot-map mt-4 rounded-xl border border-trophy-gold/20 bg-trophy-gold/10 p-4">
          <p className="mb-3 text-sm font-black">Top 8 point windows</p>
          <div className="grid gap-1.5">
            {timingRows.map(([label, time, value]) => (
              <div key={`${label}-${time}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-white/10 bg-navy-950/45 px-2.5 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-black text-foreground">{label}</span>
                  <span className="block font-semibold text-muted-foreground">{time} ET</span>
                </span>
                <span className="font-mono font-black text-trophy-gold">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-trophy-gold/20 bg-trophy-gold/10 px-2.5 py-2 text-xs font-black text-trophy-gold">Perfect 8/8 adds +10.</p>
        </div>
      </aside>
    </section>
  );
}

function BracketStage({
  rounds,
  winnersByMatch,
  pickedCount,
  champion,
  signedIn,
  busy,
  open,
  locked,
  knockoutOpenAt,
  knockoutLockAt,
  nowMs,
  activeRound,
  mobileRound,
  onMobileRound,
  onPick,
  onReset,
  onSave,
  onBack,
  onSummary,
  complete,
  knockoutMatchLocksByNo,
  actualWinnersByMatch,
}: {
  rounds: Round[];
  winnersByMatch: Record<string, number | null>;
  pickedCount: number;
  champion: PredictorTeam | null;
  signedIn: boolean;
  busy: boolean;
  open: boolean;
  locked: boolean;
  knockoutOpenAt: string;
  knockoutLockAt: string;
  nowMs: number;
  activeRound: Round | undefined;
  mobileRound: Round["key"];
  onMobileRound: (round: Round["key"]) => void;
  onPick: (match: BracketMatch, team: PredictorTeam | null) => void;
  onReset: () => void;
  onSave: () => void;
  onBack: () => void;
  onSummary: () => void;
  complete: boolean;
  knockoutMatchLocksByNo: Record<string, KnockoutMatchLock>;
  actualWinnersByMatch: Record<string, number | null>;
}) {
  const missingByRound = rounds
    .map((round) => ({
      key: round.key,
      label: round.label,
      missing: round.matches.filter((match) => match.teams[0] && match.teams[1] && !winnersByMatch[String(match.matchNo)]).length,
    }))
    .filter((round) => round.missing > 0);

  return (
    <section className="bracket-stage-card bracket-knockout-stage premium-card p-3 md:p-5">
      <div className="bracket-stage-heading mb-3 grid gap-3 md:mb-4 md:gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <div className="bracket-stage-kicker is-blue mb-2 inline-flex items-center gap-2 rounded-lg border border-electric/25 bg-electric/10 px-2.5 py-1.5 text-[0.7rem] font-black uppercase text-electric md:mb-3 md:px-3 md:py-2 md:text-xs">
            <ShieldCheck className="size-4" />
            {open ? "Bracket unlocked" : "Bracket locked"}
          </div>
          <h2 className="bracket-stage-title text-[clamp(1.45rem,7vw,2rem)] font-black leading-none md:text-[clamp(1.85rem,3.2vw,3.25rem)]">Now pick every knockout winner</h2>
          <p className="bracket-stage-copy mt-2 max-w-3xl text-xs font-semibold leading-5 text-muted-foreground md:mt-3 md:text-sm md:leading-6">
            Click teams through each round. Each Round of 32 match locks at its own kickoff; later rounds lose value as more of that branch becomes known.
          </p>
          <div className="mt-3 inline-flex w-full rounded-xl border border-electric/20 bg-electric/10 px-2.5 py-2 md:w-auto md:min-w-[16rem] md:px-3">
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-electric">
                {locked ? "Knockout bracket locked" : open ? "Knockout locks in" : "Knockout opens in"}
              </p>
              <p className="mt-1 font-mono text-lg font-black text-electric">{locked ? "Locked" : open ? formatCountdown(knockoutLockAt, nowMs) : formatCountdown(knockoutOpenAt, nowMs)}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {open ? `Final Round of 32 lock: ${formatDateTime(knockoutLockAt)}.` : `Opens ${formatDateTime(knockoutOpenAt)} after group play.`} Future R32 games keep full value until their own kickoff.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onBack}>Back to top 8</Button>
          <Button variant="secondary" onClick={onReset} disabled={busy || locked || !open}>
            <RotateCcw className="size-4" />
            Reset picks
          </Button>
          <Button
            variant={complete ? "default" : "secondary"}
            onClick={complete ? onSave : onSave}
            disabled={busy || locked || !open || !complete}
            className={cn(
              complete &&
                "border-trophy-gold/45 bg-trophy-gold text-[#11131c] shadow-[0_0_0_1px_rgba(214,178,96,.3),0_14px_44px_rgba(214,178,96,.22)] hover:bg-trophy-gold/90",
            )}
          >
            {complete ? <Trophy className="size-4" /> : <Save className="size-4" />}
            {complete ? "Save final bracket" : signedIn ? "Save when complete" : "Sign in to save"}
          </Button>
          {complete ? (
            <Button variant="secondary" onClick={onSummary}>
              Review summary
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-3 md:mb-4">
        <ProgressTile label="Matches" value={`${pickedCount}/32 picked`} complete={complete} />
        <ProgressTile label="Champion" value={champion ? shortTeamName(champion) : "Pending"} complete={Boolean(champion)} />
        <ProgressTile label="Summary" value={complete ? "Unlocked" : "Locked"} complete={complete} />
      </div>

      {!complete ? (
        <div className="mb-3 rounded-xl border border-trophy-gold/20 bg-trophy-gold/10 p-2.5 md:mb-4 md:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-trophy-gold">Missing knockout picks</p>
            <p className="font-mono text-sm font-black text-trophy-gold">{32 - pickedCount} left</p>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground md:text-sm md:leading-6">
            Finish the open rounds before saving. Later rounds fill in as earlier winners are picked.
          </p>
          {missingByRound.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {missingByRound.map((round) => (
                <button
                  key={round.key}
                  type="button"
                  className="rounded-lg border border-white/10 bg-navy-950/55 px-2 py-1 text-xs font-black text-muted-foreground hover:border-trophy-gold/35 hover:text-trophy-gold"
                  onClick={() => onMobileRound(round.key)}
                >
                  {round.label}: {round.missing}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-2 2xl:hidden">
        {ROUND_META.map((round) => (
          <button
            key={round.key}
            type="button"
            className={cn(
              "min-h-9 rounded-lg border border-white/10 bg-white/[0.045] px-1.5 text-[0.66rem] font-black text-muted-foreground transition md:min-h-10 md:px-2 md:text-xs",
              mobileRound === round.key && "is-active border-electric/60 bg-electric/15 text-foreground",
            )}
            onClick={() => onMobileRound(round.key)}
          >
            {round.label}
          </button>
        ))}
      </div>

      <div className="2xl:hidden">
        {activeRound ? <RoundColumn round={activeRound} winnersByMatch={winnersByMatch} knockoutMatchLocksByNo={knockoutMatchLocksByNo} actualWinnersByMatch={actualWinnersByMatch} onPick={onPick} mobile /> : null}
      </div>

      <div className="hidden max-h-[calc(100vh-18rem)] overflow-auto pb-2 pr-2 2xl:block">
        <div className="bracket-rounds-board grid min-w-[1180px] grid-cols-[1.2fr_1fr_.9fr_.82fr_.82fr_.7fr] gap-2">
          {rounds.map((round) => (
            <RoundColumn key={round.key} round={round} winnersByMatch={winnersByMatch} knockoutMatchLocksByNo={knockoutMatchLocksByNo} actualWinnersByMatch={actualWinnersByMatch} onPick={onPick} />
          ))}
        </div>
      </div>
      {complete ? (
        <div className="mt-3 rounded-2xl border border-trophy-gold/35 bg-trophy-gold/[0.12] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] md:mt-4 md:flex md:items-center md:justify-between md:gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-trophy-gold">Final save required</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              Your bracket is still a draft until this save succeeds. Changed matches get their own saved timestamp.
            </p>
          </div>
          <Button
            onClick={onSave}
            disabled={busy || locked || !open}
            className="mt-3 w-full border-trophy-gold/45 bg-trophy-gold text-[#11131c] shadow-[0_0_0_1px_rgba(214,178,96,.3),0_14px_44px_rgba(214,178,96,.22)] hover:bg-trophy-gold/90 md:mt-0 md:w-auto"
          >
            <Save className="size-4" />
            {busy ? "Saving" : "Save final bracket"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function RoundColumn({
  round,
  winnersByMatch,
  knockoutMatchLocksByNo,
  actualWinnersByMatch,
  onPick,
  mobile = false,
}: {
  round: Round;
  winnersByMatch: Record<string, number | null>;
  knockoutMatchLocksByNo: Record<string, KnockoutMatchLock>;
  actualWinnersByMatch: Record<string, number | null>;
  onPick: (match: BracketMatch, team: PredictorTeam | null) => void;
  mobile?: boolean;
}) {
  const primeRound = round.key === "semiFinals" || round.key === "thirdPlace" || round.key === "final";

  return (
    <section className={cn("bracket-round-modern grid min-w-0 gap-2", `is-${round.key}`, primeRound && "is-prime-round", mobile && "bracket-round-focus")}>
      <div className="flex min-h-7 items-center justify-between gap-2 px-1">
        <h2 className="truncate text-xs font-black uppercase text-muted-foreground">{round.label}</h2>
        <span className="font-mono text-xs font-black text-muted-foreground">
          {round.matches.filter((match) => winnersByMatch[String(match.matchNo)]).length}/{round.matches.length}
        </span>
      </div>
      <div className={cn("grid gap-2", mobile ? "md:grid-cols-2 xl:grid-cols-3" : "content-between")}>
        {round.matches.map((match) => (
          <MatchCard
            key={match.matchNo}
            match={match}
            winnerId={winnersByMatch[String(match.matchNo)] ?? null}
            actualWinnerId={actualWinnersByMatch[String(match.matchNo)] ?? null}
            lockInfo={knockoutMatchLocksByNo[String(match.matchNo)] ?? null}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  match,
  winnerId,
  actualWinnerId,
  lockInfo,
  onPick,
}: {
  match: BracketMatch;
  winnerId: number | null;
  actualWinnerId: number | null;
  lockInfo: KnockoutMatchLock | null;
  onPick: (match: BracketMatch, team: PredictorTeam | null) => void;
}) {
  const pending = !match.teams[0] || !match.teams[1];
  const primeMatch = match.roundKey === "semiFinals" || match.roundKey === "thirdPlace" || match.roundKey === "final";
  const lockedRoundOf32 = match.roundKey === "roundOf32" && Boolean(lockInfo?.locked);
  const hasTrueWinner = Boolean(actualWinnerId && match.teams.some((team) => team?.id === actualWinnerId));

  return (
    <article
      className={cn(
        "bracket-match-modern rounded-lg border bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition md:p-2",
        `is-${match.roundKey}`,
        primeMatch && "is-prime-match",
        pending ? "border-dashed border-white/15" : "border-white/10 hover:border-electric/35",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.66rem] font-black text-electric">M{match.matchNo}</span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {lockedRoundOf32 ? <Lock className="size-3 text-trophy-gold" /> : null}
          <span className="truncate text-[0.66rem] font-bold text-muted-foreground">{lockedRoundOf32 ? "R32 locked" : match.title}</span>
        </span>
      </div>
      <div className="grid gap-1.5">
        {[0, 1].map((index) => {
          const team = match.teams[index];
          const isWinner = Boolean(team && team.id === winnerId);
          return (
            <button
              key={`${match.matchNo}-${index}`}
              type="button"
              className={cn(
                "bracket-match-team grid min-h-9 grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-1.5 rounded-md border px-1.5 text-left transition active:translate-y-px md:min-h-10 md:grid-cols-[2.3rem_minmax(0,1fr)_4.6rem] md:gap-2 md:px-2",
                isWinner
                  ? "is-winner !border-trophy-gold/60 !bg-trophy-gold/15 !text-foreground !shadow-[0_0_0_1px_rgba(214,178,96,.28),0_0_28px_rgba(214,178,96,.22),0_16px_42px_rgba(214,178,96,.18)]"
                  : "border-white/10 bg-navy-950/55 text-muted-foreground hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground",
                lockedRoundOf32 && !isWinner && "opacity-70 hover:border-white/10 hover:bg-navy-950/55 hover:text-muted-foreground",
              )}
              title={isWinner && hasTrueWinner && team?.id === actualWinnerId ? "True winner from the official result" : undefined}
              onClick={() => onPick(match, team)}
            >
              <TeamMark team={team} fallback={match.slotLabels[index] ?? "TBD"} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{team?.name ?? match.slotLabels[index] ?? "TBD"}</span>
                <span className="block truncate text-[0.62rem] font-bold text-muted-foreground">{team?.country ?? team?.code ?? "Pending"}</span>
              </span>
              <span
                className={cn(
                  "bracket-pick-state inline-flex min-w-[3.7rem] justify-center justify-self-end rounded-full border px-1 py-1 text-[0.52rem] font-black uppercase leading-none md:min-w-[4.25rem] md:px-1.5 md:text-[0.58rem]",
                  isWinner
                    ? "is-winner !border-trophy-gold/60 !bg-trophy-gold/20 !text-trophy-gold shadow-[0_0_18px_rgba(214,178,96,.18)]"
                    : lockedRoundOf32
                      ? "border-trophy-gold/20 bg-trophy-gold/10 text-trophy-gold"
                      : "border-white/10 bg-white/[0.045] text-muted-foreground",
                )}
              >
                {isWinner ? (hasTrueWinner && team?.id === actualWinnerId ? "True winner" : "Winner") : lockedRoundOf32 ? "Locked" : "Pick"}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function TeamMark({ team, fallback }: { team: PredictorTeam | null; fallback: string }) {
  return <TeamFlag team={team} fallback={team?.code ?? fallback.replace("Group ", "")} className="bracket-team-mark" />;
}

function SummaryPanel({
  complete,
  signedIn,
  champion,
  picked,
  savedAt,
  payload,
  savePath,
  busy,
  locked,
}: {
  complete: boolean;
  signedIn: boolean;
  champion: PredictorTeam | null;
  picked: number;
  savedAt: string | null;
  payload: SavedTournamentPath;
  savePath: () => void;
  busy: boolean;
  locked: boolean;
}) {
  if (!complete) {
    return (
      <div className="grid gap-4">
        <div>
          <p className="text-lg font-black">Summary locked</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            Pick all matches to see the final path summary.
          </p>
        </div>
        <div className="rounded-lg border border-trophy-gold/20 bg-trophy-gold/10 p-4">
          <Info className="mb-3 size-5 text-trophy-gold" />
          <p className="text-sm font-black">{picked}/32 knockout picks complete</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Empty later-round slots mean an earlier matchup still needs a winner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-lg font-black">Prediction summary</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
          Review your champion and path before saving.
        </p>
      </div>
      <div className="rounded-xl border border-trophy-gold/30 bg-trophy-gold/10 p-4">
        <Image src="/assets/ui/trophy.png" alt="" width={54} height={54} className="mb-3 h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(214,178,96,.42)]" />
        <span className="text-xs font-black uppercase text-muted-foreground">Champion</span>
        <p className="mt-1 text-2xl font-black leading-tight">{champion?.name ?? "Pending"}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryStat label="R32" value={payload.roundOf32.length} />
        <SummaryStat label="R16" value={payload.roundOf16.length} />
        <SummaryStat label="QF" value={payload.quarterFinalists.length} />
        <SummaryStat label="SF" value={payload.semiFinalists.length} />
      </div>
      {savedAt ? (
        <div className="rounded-lg border border-pitch-green/25 bg-pitch-green/10 p-3 text-sm font-semibold text-pitch-green">
          Last saved {formatDateTime(savedAt)}
        </div>
      ) : null}
      {signedIn ? (
        <Button
          onClick={savePath}
          disabled={busy || locked}
          className="border-trophy-gold/45 bg-trophy-gold text-[#11131c] shadow-[0_0_0_1px_rgba(214,178,96,.3),0_14px_44px_rgba(214,178,96,.22)] hover:bg-trophy-gold/90"
        >
          <Save className="size-4" />
          {busy ? "Saving" : "Save final bracket"}
        </Button>
      ) : (
        <Button asChild>
          <Link href="/login?message=Sign%20in%20to%20save%20your%20bracket">
            <Save className="size-4" />
            Sign in to save
          </Link>
        </Button>
      )}
    </div>
  );
}

function ShareableSummaryPreview({
  champion,
  payload,
  teamsById,
  savedAt,
}: {
  champion: PredictorTeam | null;
  payload: SavedTournamentPath;
  teamsById: Map<number, PredictorTeam>;
  savedAt: string | null;
}) {
  const finalists = teamsFromIds(payload.finalists, teamsById);
  const semiFinalists = teamsFromIds(payload.semiFinalists, teamsById);
  const quarterFinalists = teamsFromIds(payload.quarterFinalists, teamsById);
  const topThirds = teamsFromIds(payload.top8TeamIds, teamsById);
  const thirdPlaceWinner = payload.thirdPlaceWinner ? teamsById.get(payload.thirdPlaceWinner) ?? null : null;

  return (
    <article className="bracket-share-card" data-bracket-summary-html="future-profile-card">
      <header className="bracket-share-header grid gap-4 md:grid-cols-[6rem_minmax(0,1fr)] md:items-center">
        <div className="bracket-share-trophy relative grid min-h-24 place-items-center overflow-hidden rounded-2xl border border-trophy-gold/25 bg-trophy-gold/10">
          <Image src="/assets/ui/trophy.png" alt="" width={112} height={112} className="relative z-10 h-[5.8rem] w-auto object-contain" />
        </div>
        <div className="min-w-0">
          <p className="wc-label">World Cup 2026 prediction</p>
          <h2 className="mt-2 text-[clamp(2rem,4vw,4.35rem)] font-black leading-none text-foreground">
            {champion ? `Your champion: ${champion.name}` : "Tournament path ready."}
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground">
            A clean card of every major pick in the full tournament path.
          </p>
        </div>
      </header>

      <section className="bracket-share-champion mt-5 grid gap-4 rounded-2xl border border-trophy-gold/30 bg-trophy-gold/10 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <TeamMark team={champion} fallback="Champion" />
          <div className="min-w-0">
            <span className="text-xs font-black uppercase text-muted-foreground">Champion pick</span>
            <p className="mt-1 truncate text-3xl font-black leading-tight text-foreground">{champion?.name ?? "Pending"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-navy-950/55 px-4 py-3 text-right">
          <span className="text-xs font-black uppercase text-muted-foreground">{savedAt ? "Saved" : "Status"}</span>
          <p className="mt-1 font-mono text-sm font-black text-trophy-gold">{savedAt ? formatDateTime(savedAt) : "Ready"}</p>
        </div>
      </section>

      <div className="bracket-share-grid mt-4 grid gap-3 lg:grid-cols-2">
        <SummaryTeamStrip label="Finalists" teams={finalists} emptyLabel="Final pending" />
        <SummaryTeamStrip label="Third place" teams={thirdPlaceWinner ? [thirdPlaceWinner] : []} emptyLabel="Third place pending" />
        <SummaryTeamStrip label="Semi-finalists" teams={semiFinalists} emptyLabel="Semi-finalists pending" />
        <SummaryTeamStrip label="Quarter-finalists" teams={quarterFinalists} emptyLabel="Quarter-finalists pending" max={8} />
        <SummaryTeamStrip label="Top 8 thirds" teams={topThirds} emptyLabel="Top 8 pending" max={8} wide />
      </div>
    </article>
  );
}

function SummaryTeamStrip({
  label,
  teams,
  emptyLabel,
  max = 4,
  wide = false,
}: {
  label: string;
  teams: PredictorTeam[];
  emptyLabel: string;
  max?: number;
  wide?: boolean;
}) {
  const visibleTeams = teams.slice(0, max);
  const hiddenCount = Math.max(teams.length - visibleTeams.length, 0);

  return (
    <section className={cn("bracket-summary-strip-card rounded-xl border border-white/10 bg-white/[0.045] p-3", wide && "lg:col-span-2")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase text-muted-foreground">{label}</h3>
        <span className="font-mono text-xs font-black text-muted-foreground">{teams.length}</span>
      </div>
      {visibleTeams.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {visibleTeams.map((team) => (
            <span key={team.id} className="bracket-summary-team-pill inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-white/10 bg-navy-950/55 px-2 py-1.5">
              <InlineTeamFlag team={team} />
              <span className="truncate text-xs font-black text-foreground">{team.name}</span>
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="bracket-summary-team-pill inline-flex items-center rounded-lg border border-white/10 bg-navy-950/55 px-2 py-1.5 font-mono text-xs font-black text-muted-foreground">
              +{hiddenCount}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

function teamsFromIds(ids: number[], teamsById: Map<number, PredictorTeam>) {
  return ids.map((id) => teamsById.get(id) ?? null).filter((team): team is PredictorTeam => Boolean(team));
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
      <p className="mt-1 font-mono text-xl font-black">{value}</p>
    </div>
  );
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
