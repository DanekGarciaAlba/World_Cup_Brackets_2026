import { mascotIds, type MascotId } from "./mascotCatalog";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTO_UNLOCK_WEEK_ONE_AT = "2026-06-18T14:00:00.000Z";
export const AUTO_UNLOCK_WEEK_TWO_AT = "2026-06-24T19:00:00.000Z";
export const AUTO_UNLOCK_KNOCKOUT_AT = "2026-06-28T19:00:00.000Z";
export const FINAL_WEEK_UNLOCK_FALLBACK_AT = "2026-07-12T19:00:00.000Z";

export type MascotUnlockContext = {
  cosmeticPoints?: number;
  finalWeekUnlock?: boolean;
  now?: Date;
};

function cleanPoints(points: number | null | undefined) {
  return typeof points === "number" && Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}

function nowTime(now?: Date) {
  const value = now?.getTime() ?? Date.now();
  return Number.isFinite(value) ? value : Date.now();
}

function isAtOrAfter(iso: string | null, now?: Date) {
  if (!iso) return false;
  const unlockTime = new Date(iso).getTime();
  return Number.isFinite(unlockTime) && nowTime(now) >= unlockTime;
}

export function isWorldCupFinalWeek(now: Date, finalMatchKickoffAt: string | null | undefined) {
  const finalTime = finalMatchKickoffAt ? new Date(finalMatchKickoffAt).getTime() : Number.NaN;
  const nowTime = now.getTime();
  if (!Number.isFinite(nowTime)) return false;
  if (Number.isFinite(finalTime)) return nowTime >= finalTime - ONE_WEEK_MS;
  return isAtOrAfter(FINAL_WEEK_UNLOCK_FALLBACK_AT, now);
}

export function mascotSlotRequirement(slotIndex: number) {
  if (slotIndex <= 0) {
    return {
      unlockPoints: 0,
      autoUnlockAt: null,
      unlockLabel: "Starter choice.",
    };
  }

  if (slotIndex === 1) {
    return {
      unlockPoints: 60,
      autoUnlockAt: AUTO_UNLOCK_WEEK_ONE_AT,
      unlockLabel: "Unlocks at 60 pts or Jun 18.",
    };
  }

  return {
    unlockPoints: 120,
    autoUnlockAt: AUTO_UNLOCK_KNOCKOUT_AT,
    unlockLabel: "Unlocks at 120 pts or Jun 28.",
  };
}

export function resolveMascotUnlocks(starterMascot: MascotId, context: MascotUnlockContext = {}) {
  if (context.finalWeekUnlock) return [...mascotIds];

  const cosmeticPoints = cleanPoints(context.cosmeticPoints);
  const ordered = [starterMascot, ...mascotIds.filter((id) => id !== starterMascot)];
  return ordered.filter((_, index) => {
    const requirement = mascotSlotRequirement(index);
    return cosmeticPoints >= requirement.unlockPoints || isAtOrAfter(requirement.autoUnlockAt, context.now);
  });
}

export function mascotUnlockStatus(mascotId: MascotId, starterMascot: MascotId, context: MascotUnlockContext = {}) {
  const ordered = [starterMascot, ...mascotIds.filter((id) => id !== starterMascot)];
  const slotIndex = Math.max(0, ordered.indexOf(mascotId));
  const requirement = mascotSlotRequirement(slotIndex);
  const unlocked =
    context.finalWeekUnlock ||
    slotIndex === 0 ||
    cleanPoints(context.cosmeticPoints) >= requirement.unlockPoints ||
    isAtOrAfter(requirement.autoUnlockAt, context.now);

  return {
    unlocked,
    slotIndex,
    unlockPoints: requirement.unlockPoints,
    autoUnlockAt: requirement.autoUnlockAt,
    unlockLabel: requirement.unlockLabel,
    requirement: unlocked ? (slotIndex === 0 ? "Starter mascot." : "Unlocked.") : requirement.unlockLabel,
    finalWeekUnlock: true,
  };
}

export function nextMascotMilestone(cosmeticPoints: number, finalWeekUnlock: boolean) {
  if (finalWeekUnlock || cosmeticPoints >= 120) return null;
  return cosmeticPoints >= 60 ? 120 : 60;
}
