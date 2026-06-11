import { mascotIds, type MascotId } from "./mascotCatalog";
import { AUTO_UNLOCK_KNOCKOUT_AT, AUTO_UNLOCK_WEEK_ONE_AT, AUTO_UNLOCK_WEEK_TWO_AT } from "./unlocks";

export type SkinRarity = "Starter" | "Rare" | "Epic" | "Legendary";

export type MascotSkin = {
  id: string;
  mascotId: MascotId;
  name: string;
  rarity: SkinRarity;
  lockedByDefault: boolean;
  unlockRequirement: string;
  thumbnailPath: string | null;
  modelUrl: string | null;
  isPlaceholder: true;
  gradient: readonly [string, string];
  accent: string;
  unlockPoints: number;
  autoUnlockAt: string | null;
  unlockLabel: string;
  finalWeekUnlock: boolean;
};

type SkinRow = {
  slug: string;
  name: string;
  rarity: SkinRarity;
  asset: string;
  gradient: readonly [string, string];
  accent: string;
};

const skinRows: Record<MascotId, readonly SkinRow[]> = {
  maple: [
    {
      slug: "starter",
      name: "Starter",
      rarity: "Starter",
      asset: "/assets/profile/maple/skins/starter.png",
      gradient: ["#b94c34", "#75b94b"],
      accent: "#d8b157",
    },
    {
      slug: "ice-guard",
      name: "Ice Guard",
      rarity: "Rare",
      asset: "/assets/profile/maple/skins/ice-guard.png",
      gradient: ["#dbeafe", "#26375f"],
      accent: "#9edcff",
    },
    {
      slug: "white-captain",
      name: "White Captain",
      rarity: "Epic",
      asset: "/assets/profile/maple/skins/white-captain.png",
      gradient: ["#f8fafc", "#3151a8"],
      accent: "#d8b157",
    },
    {
      slug: "classic-home",
      name: "Classic Home",
      rarity: "Legendary",
      asset: "/assets/profile/maple/skins/classic-home.png",
      gradient: ["#cf573c", "#701f2c"],
      accent: "#ffd7c2",
    },
  ],
  zayu: [
    {
      slug: "starter",
      name: "Starter",
      rarity: "Starter",
      asset: "/assets/profile/zayu/skins/starter.png",
      gradient: ["#0f7a4e", "#d94436"],
      accent: "#d8b157",
    },
    {
      slug: "black-gold",
      name: "Black Gold",
      rarity: "Rare",
      asset: "/assets/profile/zayu/skins/black-gold.png",
      gradient: ["#111827", "#15803d"],
      accent: "#f5c94d",
    },
    {
      slug: "lucha-white",
      name: "Lucha White",
      rarity: "Epic",
      asset: "/assets/profile/zayu/skins/lucha-white.png",
      gradient: ["#f2f4ff", "#0b6b47"],
      accent: "#d94436",
    },
    {
      slug: "verde-sombrero",
      name: "Verde Sombrero",
      rarity: "Legendary",
      asset: "/assets/profile/zayu/skins/verde-sombrero.png",
      gradient: ["#15803d", "#0b3d2c"],
      accent: "#ffe199",
    },
  ],
  clutch: [
    {
      slug: "starter",
      name: "Starter",
      rarity: "Starter",
      asset: "/assets/profile/clutch/skins/starter.png",
      gradient: ["#1d4ed8", "#a61d33"],
      accent: "#d8b157",
    },
    {
      slug: "gold-striker",
      name: "Gold Striker",
      rarity: "Rare",
      asset: "/assets/profile/clutch/skins/gold-striker.png",
      gradient: ["#f5c94d", "#8a3d12"],
      accent: "#fff3b0",
    },
    {
      slug: "helmet-home",
      name: "Helmet Home",
      rarity: "Epic",
      asset: "/assets/profile/clutch/skins/helmet-home.png",
      gradient: ["#0b1741", "#1d4ed8"],
      accent: "#d8b157",
    },
    {
      slug: "stars-top-hat",
      name: "Stars Top Hat",
      rarity: "Legendary",
      asset: "/assets/profile/clutch/skins/stars-top-hat.png",
      gradient: ["#1d4ed8", "#a61d33"],
      accent: "#f8fafc",
    },
  ],
};

function buildSkins(mascotId: MascotId, rows: readonly SkinRow[]): MascotSkin[] {
  return rows.map((row) => ({
    id: `${mascotId}-${row.slug}`,
    mascotId,
    name: row.name,
    rarity: row.rarity,
    lockedByDefault: row.rarity !== "Starter",
    unlockRequirement: skinUnlockRequirement(row.rarity),
    thumbnailPath: row.asset,
    modelUrl: null,
    isPlaceholder: true,
    gradient: row.gradient,
    accent: row.accent,
    unlockPoints: skinUnlockPoints(row.rarity),
    autoUnlockAt: skinAutoUnlockAt(row.rarity),
    unlockLabel: skinUnlockRequirement(row.rarity),
    finalWeekUnlock: true,
  }));
}

export const skinCatalog = mascotIds.flatMap((mascotId) => buildSkins(mascotId, skinRows[mascotId]));

export function getSkinsForMascot(mascotId: MascotId) {
  return skinCatalog.filter((skin) => skin.mascotId === mascotId);
}

export function findSkinById(id?: string | null) {
  return skinCatalog.find((skin) => skin.id === id) ?? null;
}

export function getDefaultSkinForMascot(mascotId: MascotId) {
  return getSkinsForMascot(mascotId)[0];
}

export function normalizeSkinId(value: unknown, mascotId?: MascotId) {
  if (typeof value !== "string") return null;
  const skin = findSkinById(value.trim());
  if (!skin) return null;
  if (mascotId && skin.mascotId !== mascotId) return null;
  return skin.id;
}

export function getCatalogCompletionCounts(unlockedMascots: MascotId[], fullCosmeticAccess = false) {
  const unlockedMascotSet = new Set(unlockedMascots);
  const unlockedSkins = skinCatalog.filter((skin) => unlockedMascotSet.has(skin.mascotId) && (fullCosmeticAccess || !skin.lockedByDefault)).length;
  return {
    mascots: unlockedMascots.length,
    mascotTotal: mascotIds.length,
    skins: unlockedSkins,
    skinTotal: skinCatalog.length,
  };
}

function skinUnlockPoints(rarity: SkinRarity) {
  if (rarity === "Rare") return 30;
  if (rarity === "Epic") return 80;
  if (rarity === "Legendary") return 140;
  return 0;
}

function skinAutoUnlockAt(rarity: SkinRarity) {
  if (rarity === "Rare") return AUTO_UNLOCK_WEEK_ONE_AT;
  if (rarity === "Epic") return AUTO_UNLOCK_WEEK_TWO_AT;
  if (rarity === "Legendary") return AUTO_UNLOCK_KNOCKOUT_AT;
  return null;
}

function skinUnlockRequirement(rarity: SkinRarity) {
  if (rarity === "Rare") return "Unlocks at 30 pts or Jun 18.";
  if (rarity === "Epic") return "Unlocks at 80 pts or Jun 24.";
  if (rarity === "Legendary") return "Unlocks at 140 pts or Jun 28.";
  return "Starter set.";
}
