import { mascotIds, normalizeMascotId, type MascotId } from "./mascotCatalog";
import { resolveMascotUnlocks } from "./unlocks";

export function normalizeMascotList(value: unknown): MascotId[] {
  if (!Array.isArray(value)) return [];

  const normalized: MascotId[] = [];
  for (const item of value) {
    const mascotId = normalizeMascotId(item);
    if (mascotId && !normalized.includes(mascotId)) normalized.push(mascotId);
  }
  return normalized;
}

export function mergeMascotIds(values: Array<MascotId | null | undefined>): MascotId[] {
  const merged: MascotId[] = [];
  for (const value of values) {
    if (value && !merged.includes(value)) merged.push(value);
  }
  return merged;
}

export type MascotLockerStateInput = {
  starterMascot?: string | null;
  selectedMascot?: string | null;
  storedUnlockedMascots?: unknown;
  bestCorrectStreak?: number | null;
  cosmeticPoints?: number | null;
  finalWeekUnlock?: boolean;
  fullCosmeticAccess?: boolean;
  now?: Date;
};

export function resolveMascotLockerDisplayState(input: MascotLockerStateInput) {
  const starterMascot = normalizeMascotId(input.starterMascot) ?? "maple";
  const savedSelectedMascot = normalizeMascotId(input.selectedMascot);
  const selectedMascot = savedSelectedMascot ?? starterMascot;
  const cosmeticPoints =
    typeof input.cosmeticPoints === "number" && Number.isFinite(input.cosmeticPoints) && input.cosmeticPoints > 0
      ? Math.floor(input.cosmeticPoints)
      : 0;

  if (input.fullCosmeticAccess) {
    return {
      starterMascot,
      selectedMascot,
      unlockedMascots: [...mascotIds],
    };
  }

  const ruleUnlockedMascots = resolveMascotUnlocks(starterMascot, {
    cosmeticPoints,
    finalWeekUnlock: Boolean(input.finalWeekUnlock),
    now: input.now,
  });
  const storedUnlockedMascots = normalizeMascotList(input.storedUnlockedMascots);

  return {
    starterMascot,
    selectedMascot,
    unlockedMascots: mergeMascotIds([...ruleUnlockedMascots, ...storedUnlockedMascots, starterMascot, selectedMascot]),
  };
}
