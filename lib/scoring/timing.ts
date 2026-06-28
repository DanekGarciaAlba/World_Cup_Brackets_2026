export type TimingResult = {
  bucket: string;
  multiplier: number;
  multiplierBP: number;
  eligible: boolean;
  hoursBeforeDeadline: number | null;
};

export type StageMultiplierResult = {
  stage: string;
  multiplier: number;
  multiplierBP: number;
};

function timing(bucket: string, multiplierBP: number, eligible: boolean, hoursBeforeDeadline: number | null): TimingResult {
  return {
    bucket,
    multiplier: multiplierBP / 100,
    multiplierBP,
    eligible,
    hoursBeforeDeadline,
  };
}

function hoursBefore(submittedAt?: string | Date | null, deadlineAt?: string | Date | null) {
  if (!submittedAt || !deadlineAt) return null;
  const submitted = new Date(submittedAt).getTime();
  const deadline = new Date(deadlineAt).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(deadline)) return null;
  return (deadline - submitted) / 36e5;
}

export const TOP8_TIMING_OPEN_AT = "2026-06-18T14:00:00.000Z";
export const TOP8_PERFECT_BONUS_POINTS = 10;

export type Top8PointWindow = {
  at: string;
  bucket: string;
  label: string;
  detail: string;
  pointsPerCorrectTeam: number;
};

export type Top8PointTimingResult = TimingResult & {
  pointsPerCorrectTeam: number;
  windowLabel: string | null;
  windowDetail: string | null;
};

export const TOP8_POINT_WINDOWS = [
  { at: TOP8_TIMING_OPEN_AT, bucket: "top8_open", label: "Open", detail: "Jun 18, 10:00 AM ET", pointsPerCorrectTeam: 9 },
  { at: "2026-06-20T14:00:00.000Z", bucket: "top8_jun20", label: "Jun 20", detail: "10:00 AM ET", pointsPerCorrectTeam: 8 },
  { at: "2026-06-22T14:00:00.000Z", bucket: "top8_jun22", label: "Jun 22", detail: "10:00 AM ET", pointsPerCorrectTeam: 6 },
  { at: "2026-06-23T14:00:00.000Z", bucket: "top8_jun23", label: "Jun 23", detail: "10:00 AM ET", pointsPerCorrectTeam: 4 },
  { at: "2026-06-24T04:00:00.000Z", bucket: "top8_jun24", label: "Jun 24", detail: "Before 3:00 PM ET", pointsPerCorrectTeam: 3 },
] as const;

export function resolveDailyTiming(submittedAt?: string | Date | null, kickoffAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, kickoffAt);
  if (hours === null) return timing("unknown", 100, true, null);
  if (hours <= 0) return timing("after_kickoff", 0, false, hours);
  if (hours >= 24 * 7) return timing("7d_plus", 135, true, hours);
  if (hours >= 48) return timing("48h_to_7d", 120, true, hours);
  if (hours >= 12) return timing("12h_to_48h", 110, true, hours);
  if (hours >= 2) return timing("2h_to_12h", 100, true, hours);
  if (hours >= 0.5) return timing("30m_to_2h", 80, true, hours);
  return timing("0_to_30m", 60, true, hours);
}

export function isKnockoutFixtureStage(stage?: string | null) {
  const normalized = String(stage ?? "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return (
    normalized.includes("round_of_32") ||
    normalized.includes("round_of_16") ||
    normalized.includes("quarter") ||
    normalized.includes("semi") ||
    normalized.includes("third") ||
    (normalized.includes("final") && !normalized.includes("qualification"))
  );
}

export function resolveKnockoutFixtureTiming(submittedAt?: string | Date | null, kickoffAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, kickoffAt);
  if (hours === null) return timing("unknown", 100, true, null);
  if (hours <= 0) return timing("after_kickoff", 0, false, hours);
  if (hours >= 48) return timing("48h_plus", 135, true, hours);
  if (hours >= 24) return timing("24h_to_48h", 120, true, hours);
  if (hours >= 12) return timing("12h_to_24h", 110, true, hours);
  if (hours >= 2) return timing("2h_to_12h", 100, true, hours);
  if (hours >= 0.5) return timing("30m_to_2h", 80, true, hours);
  return timing("0_to_30m", 60, true, hours);
}

export function resolveFixtureTiming(submittedAt?: string | Date | null, kickoffAt?: string | Date | null, stage?: string | null): TimingResult {
  return isKnockoutFixtureStage(stage) ? resolveKnockoutFixtureTiming(submittedAt, kickoffAt) : resolveDailyTiming(submittedAt, kickoffAt);
}

export function resolveBracketTiming(submittedAt?: string | Date | null, deadlineAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, deadlineAt);
  if (hours === null) return timing("pending_deadline", 0, false, null);
  if (hours <= 0) return timing("after_deadline", 0, false, hours);
  if (hours >= 24 * 7) return timing("7d_plus", 125, true, hours);
  if (hours >= 48) return timing("48h_to_7d", 110, true, hours);
  if (hours >= 2) return timing("2h_to_48h", 100, true, hours);
  return timing("0_to_2h", 75, true, hours);
}

function top8PointTiming(
  bucket: string,
  pointsPerCorrectTeam: number,
  eligible: boolean,
  hoursBeforeDeadline: number | null,
  windowLabel: string | null,
  windowDetail: string | null,
): Top8PointTimingResult {
  return {
    ...timing(bucket, eligible ? 100 : 0, eligible, hoursBeforeDeadline),
    pointsPerCorrectTeam,
    windowLabel,
    windowDetail,
  };
}

export function resolveTop8PickPoints(submittedAt?: string | Date | null, lockAt?: string | Date | null): Top8PointTimingResult {
  const hours = hoursBefore(submittedAt, lockAt);
  if (hours === null || !submittedAt || !lockAt) return top8PointTiming("pending_deadline", 0, false, null, null, null);
  const submitted = new Date(submittedAt).getTime();
  const lock = new Date(lockAt).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(lock) || submitted >= lock) return top8PointTiming("after_deadline", 0, false, hours, "Lock", "Jun 24, 3:00 PM ET");

  const windows = TOP8_POINT_WINDOWS.map((window) => ({ ...window, time: Date.parse(window.at) }))
    .filter((window) => Number.isFinite(window.time) && window.time < lock)
    .sort((a, b) => a.time - b.time);
  if (windows.length === 0) return top8PointTiming("top8_on_time", 3, true, hours, null, null);

  let active = windows[0];
  for (const window of windows) {
    if (submitted >= window.time) active = window;
  }

  return top8PointTiming(active.bucket, active.pointsPerCorrectTeam, true, hours, active.label, active.detail);
}

export function resolveTop8Timing(submittedAt?: string | Date | null, lockAt?: string | Date | null): TimingResult {
  const top8 = resolveTop8PickPoints(submittedAt, lockAt);
  return timing(top8.bucket, top8.eligible ? 100 : 0, top8.eligible, top8.hoursBeforeDeadline);
}

export function resolveKnockoutTiming(submittedAt?: string | Date | null, lockAt?: string | Date | null, openAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, lockAt);
  if (hours === null) return timing("pending_deadline", 0, false, null);
  if (openAt) {
    const submitted = new Date(submittedAt ?? "").getTime();
    const open = new Date(openAt).getTime();
    if (Number.isFinite(submitted) && Number.isFinite(open) && submitted < open) return timing("before_window", 0, false, hours);
  }
  if (hours <= 0) return timing("after_deadline", 0, false, hours);
  return timing("knockout_on_time", 100, true, hours);
}

export function resolveMatchStageMultiplier(stage?: string | null): StageMultiplierResult {
  const normalized = String(stage ?? "group").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized.includes("final") && !normalized.includes("semi") && !normalized.includes("quarter")) {
    return { stage: normalized.includes("third") ? "third_place" : "final", multiplier: 1.25, multiplierBP: 125 };
  }
  if (normalized.includes("third")) return { stage: "third_place", multiplier: 1.25, multiplierBP: 125 };
  if (normalized.includes("quarter")) return { stage: "quarter_final", multiplier: 1.2, multiplierBP: 120 };
  if (normalized.includes("semi")) return { stage: "semi_final", multiplier: 1.2, multiplierBP: 120 };
  if (normalized.includes("round_of_32") || normalized.includes("round of 32")) return { stage: "round_of_32", multiplier: 1.1, multiplierBP: 110 };
  if (normalized.includes("round_of_16") || normalized.includes("round of 16")) return { stage: "round_of_16", multiplier: 1.1, multiplierBP: 110 };
  return { stage: "group", multiplier: 1, multiplierBP: 100 };
}

export function applyBasisPointMultiplier(basePoints: number, ...multipliers: number[]) {
  const numerator = multipliers.reduce((value, multiplier) => value * multiplier, basePoints);
  const denominator = 100 ** multipliers.length;
  return Math.floor(numerator / denominator);
}
