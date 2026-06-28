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
export const TOP8_MAX_MULTIPLIER_BP = 140;
export const TOP8_MIN_MULTIPLIER_BP = 100;
const TOP8_TIMING_ANCHORS = [
  { at: TOP8_TIMING_OPEN_AT, multiplierBP: 140, bucket: "top8_open" },
  { at: "2026-06-20T14:00:00.000Z", multiplierBP: 120, bucket: "top8_jun20" },
  { at: "2026-06-22T14:00:00.000Z", multiplierBP: 105, bucket: "top8_jun22" },
  { at: "2026-06-23T14:00:00.000Z", multiplierBP: 100, bucket: "top8_floor" },
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

export function resolveTop8Timing(submittedAt?: string | Date | null, lockAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, lockAt);
  if (hours === null || !submittedAt || !lockAt) return timing("pending_deadline", 0, false, null);
  const submitted = new Date(submittedAt).getTime();
  const lock = new Date(lockAt).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(lock) || submitted >= lock) return timing("after_deadline", 0, false, hours);

  const anchors = TOP8_TIMING_ANCHORS.map((anchor) => ({ ...anchor, time: Date.parse(anchor.at) }))
    .filter((anchor) => Number.isFinite(anchor.time) && anchor.time < lock)
    .sort((a, b) => a.time - b.time);
  if (anchors.length === 0) return timing("top8_on_time", TOP8_MIN_MULTIPLIER_BP, true, hours);

  if (submitted <= anchors[0].time) return timing(anchors[0].bucket, anchors[0].multiplierBP, true, hours);

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index];
    const next = anchors[index + 1];
    if (submitted <= next.time) {
      const span = next.time - current.time;
      const elapsed = submitted - current.time;
      const ratio = span > 0 ? elapsed / span : 1;
      const multiplierBP = Math.round(current.multiplierBP + (next.multiplierBP - current.multiplierBP) * ratio);
      return timing("top8_decay", multiplierBP, true, hours);
    }
  }

  return timing("top8_floor", TOP8_MIN_MULTIPLIER_BP, true, hours);
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
