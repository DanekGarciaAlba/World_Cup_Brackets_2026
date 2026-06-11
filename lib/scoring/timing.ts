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

  const earlyEnd = Date.parse("2026-06-21T03:59:59.999Z");
  const normalEnd = Date.parse("2026-06-23T03:59:59.999Z");
  if (submitted <= earlyEnd) return timing("top8_early", 115, true, hours);
  if (submitted <= normalEnd) return timing("top8_standard", 100, true, hours);
  return timing("top8_late", 80, true, hours);
}

export function resolveKnockoutTiming(submittedAt?: string | Date | null, lockAt?: string | Date | null): TimingResult {
  const hours = hoursBefore(submittedAt, lockAt);
  if (hours === null) return timing("pending_deadline", 0, false, null);
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
