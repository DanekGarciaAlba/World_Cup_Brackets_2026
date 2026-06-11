import type { MascotId } from "../mascots/mascotCatalog";
import { AUTO_UNLOCK_WEEK_ONE_AT, AUTO_UNLOCK_WEEK_TWO_AT } from "../mascots/unlocks";

export type EmoteCatalogItem = {
  id: string;
  mascotId?: MascotId;
  skinId: string;
  name: string;
  lockedByDefault: boolean;
  unlockRequirement: string;
  thumbnailPath: string | null;
  isPlaceholder: true;
  icon: "trophy" | "slide" | "dance" | "crown" | "spark" | "calm" | "wag" | "quiet" | "score" | "rank" | "bracket" | "group";
  gradient: [string, string];
  unlockPoints: number;
  autoUnlockAt: string | null;
  unlockLabel: string;
  finalWeekUnlock: boolean;
};

type EmoteRow = {
  mascotId: MascotId;
  skinId: string;
  slug: string;
  name: string;
  asset: string;
  icon: EmoteCatalogItem["icon"];
  gradient: [string, string];
};

const emoteRows: EmoteRow[] = [
  {
    mascotId: "maple",
    skinId: "maple-starter",
    slug: "thumbs-up",
    name: "Starter Thumbs Up",
    asset: "/assets/profile/maple/emotes/starter-thumbs-up.png",
    icon: "trophy",
    gradient: ["#d8b157", "#b94c34"],
  },
  {
    mascotId: "maple",
    skinId: "maple-starter",
    slug: "roar",
    name: "Starter Roar",
    asset: "/assets/profile/maple/emotes/starter-roar.png",
    icon: "spark",
    gradient: ["#cf573c", "#75b94b"],
  },
  {
    mascotId: "maple",
    skinId: "maple-starter",
    slug: "heartbreak",
    name: "Starter Hold",
    asset: "/assets/profile/maple/emotes/starter-heartbreak.png",
    icon: "calm",
    gradient: ["#b94c34", "#071126"],
  },
  {
    mascotId: "maple",
    skinId: "maple-classic-home",
    slug: "thumbs-up",
    name: "Glove Thumbs Up",
    asset: "/assets/profile/maple/emotes/classic-thumbs-up.png",
    icon: "trophy",
    gradient: ["#d8b157", "#701f2c"],
  },
  {
    mascotId: "maple",
    skinId: "maple-classic-home",
    slug: "roar",
    name: "Maple Roar",
    asset: "/assets/profile/maple/emotes/classic-roar.png",
    icon: "spark",
    gradient: ["#cf573c", "#210914"],
  },
  {
    mascotId: "maple",
    skinId: "maple-classic-home",
    slug: "heartbreak",
    name: "Final Whistle",
    asset: "/assets/profile/maple/emotes/classic-heartbreak.png",
    icon: "calm",
    gradient: ["#cf573c", "#172554"],
  },
  {
    mascotId: "maple",
    skinId: "maple-ice-guard",
    slug: "thumbs-up",
    name: "Ice Thumbs Up",
    asset: "/assets/profile/maple/emotes/ice-thumbs-up.png",
    icon: "rank",
    gradient: ["#7fd2ff", "#26375f"],
  },
  {
    mascotId: "maple",
    skinId: "maple-ice-guard",
    slug: "roar",
    name: "Frost Roar",
    asset: "/assets/profile/maple/emotes/ice-roar.png",
    icon: "slide",
    gradient: ["#dbeafe", "#3151a8"],
  },
  {
    mascotId: "maple",
    skinId: "maple-ice-guard",
    slug: "heartbreak",
    name: "Frozen Nerves",
    asset: "/assets/profile/maple/emotes/ice-heartbreak.png",
    icon: "quiet",
    gradient: ["#9edcff", "#071126"],
  },
  {
    mascotId: "maple",
    skinId: "maple-white-captain",
    slug: "thumbs-up",
    name: "Captain Wink",
    asset: "/assets/profile/maple/emotes/white-thumbs-up.png",
    icon: "trophy",
    gradient: ["#f8fafc", "#3151a8"],
  },
  {
    mascotId: "maple",
    skinId: "maple-white-captain",
    slug: "roar",
    name: "Captain Charge",
    asset: "/assets/profile/maple/emotes/white-roar.png",
    icon: "bracket",
    gradient: ["#3151a8", "#f5c94d"],
  },
  {
    mascotId: "maple",
    skinId: "maple-white-captain",
    slug: "heartbreak",
    name: "Captain Reset",
    asset: "/assets/profile/maple/emotes/white-heartbreak.png",
    icon: "calm",
    gradient: ["#f8fafc", "#273353"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-starter",
    slug: "thumbs-up",
    name: "Starter Thumbs Up",
    asset: "/assets/profile/zayu/emotes/starter-thumbs-up.png",
    icon: "trophy",
    gradient: ["#d8b157", "#0f7a4e"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-starter",
    slug: "roar",
    name: "Starter Roar",
    asset: "/assets/profile/zayu/emotes/starter-roar.png",
    icon: "spark",
    gradient: ["#0f7a4e", "#d94436"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-starter",
    slug: "heartbreak",
    name: "Starter Hold",
    asset: "/assets/profile/zayu/emotes/starter-heartbreak.png",
    icon: "calm",
    gradient: ["#0f7a4e", "#071126"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-black-gold",
    slug: "thumbs-up",
    name: "Gold Wink",
    asset: "/assets/profile/zayu/emotes/black-thumbs-up.png",
    icon: "trophy",
    gradient: ["#f5c94d", "#111827"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-black-gold",
    slug: "roar",
    name: "Black Gold Roar",
    asset: "/assets/profile/zayu/emotes/black-roar.png",
    icon: "spark",
    gradient: ["#111827", "#d8b157"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-black-gold",
    slug: "heartbreak",
    name: "Gold Nerves",
    asset: "/assets/profile/zayu/emotes/black-heartbreak.png",
    icon: "calm",
    gradient: ["#111827", "#15803d"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-verde-sombrero",
    slug: "thumbs-up",
    name: "Sombrero Wink",
    asset: "/assets/profile/zayu/emotes/verde-thumbs-up.png",
    icon: "dance",
    gradient: ["#15803d", "#d8b157"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-verde-sombrero",
    slug: "roar",
    name: "Verde Roar",
    asset: "/assets/profile/zayu/emotes/verde-roar.png",
    icon: "group",
    gradient: ["#0b6b47", "#d94436"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-verde-sombrero",
    slug: "heartbreak",
    name: "Verde Hold",
    asset: "/assets/profile/zayu/emotes/verde-heartbreak.png",
    icon: "calm",
    gradient: ["#15803d", "#0b1120"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-lucha-white",
    slug: "thumbs-up",
    name: "Lucha Wink",
    asset: "/assets/profile/zayu/emotes/lucha-thumbs-up.png",
    icon: "rank",
    gradient: ["#f8fafc", "#0b6b47"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-lucha-white",
    slug: "roar",
    name: "Mask Roar",
    asset: "/assets/profile/zayu/emotes/lucha-roar.png",
    icon: "crown",
    gradient: ["#d94436", "#f8fafc"],
  },
  {
    mascotId: "zayu",
    skinId: "zayu-lucha-white",
    slug: "heartbreak",
    name: "Masked Nerves",
    asset: "/assets/profile/zayu/emotes/lucha-heartbreak.png",
    icon: "quiet",
    gradient: ["#f8fafc", "#17331d"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-starter",
    slug: "thumbs-up",
    name: "Starter Salute",
    asset: "/assets/profile/clutch/emotes/starter-thumbs-up.png",
    icon: "trophy",
    gradient: ["#d8b157", "#1d4ed8"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-starter",
    slug: "roar",
    name: "Starter Roar",
    asset: "/assets/profile/clutch/emotes/starter-roar.png",
    icon: "spark",
    gradient: ["#1d4ed8", "#a61d33"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-starter",
    slug: "heartbreak",
    name: "Starter Hold",
    asset: "/assets/profile/clutch/emotes/starter-heartbreak.png",
    icon: "calm",
    gradient: ["#1d4ed8", "#071126"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-gold-striker",
    slug: "thumbs-up",
    name: "Gold Thumbs Up",
    asset: "/assets/profile/clutch/emotes/gold-thumbs-up.png",
    icon: "trophy",
    gradient: ["#f5c94d", "#8a3d12"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-gold-striker",
    slug: "roar",
    name: "Gold Roar",
    asset: "/assets/profile/clutch/emotes/gold-roar.png",
    icon: "spark",
    gradient: ["#f5c94d", "#a61d33"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-gold-striker",
    slug: "heartbreak",
    name: "Gold Hold",
    asset: "/assets/profile/clutch/emotes/gold-heartbreak.png",
    icon: "calm",
    gradient: ["#f5c94d", "#172554"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-stars-top-hat",
    slug: "thumbs-up",
    name: "Stars Salute",
    asset: "/assets/profile/clutch/emotes/stars-thumbs-up.png",
    icon: "rank",
    gradient: ["#1d4ed8", "#f8fafc"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-stars-top-hat",
    slug: "roar",
    name: "Stars Roar",
    asset: "/assets/profile/clutch/emotes/stars-roar.png",
    icon: "crown",
    gradient: ["#1d4ed8", "#a61d33"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-stars-top-hat",
    slug: "heartbreak",
    name: "Stars Reset",
    asset: "/assets/profile/clutch/emotes/stars-heartbreak.png",
    icon: "quiet",
    gradient: ["#1d4ed8", "#020617"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-helmet-home",
    slug: "heartbreak",
    name: "Helmet Hold",
    asset: "/assets/profile/clutch/emotes/helmet-heartbreak.png",
    icon: "calm",
    gradient: ["#0b1741", "#6684ff"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-helmet-home",
    slug: "roar",
    name: "Helmet Roar",
    asset: "/assets/profile/clutch/emotes/helmet-roar.png",
    icon: "bracket",
    gradient: ["#1d4ed8", "#a61d33"],
  },
  {
    mascotId: "clutch",
    skinId: "clutch-helmet-home",
    slug: "thumbs-up",
    name: "Helmet Thumbs Up",
    asset: "/assets/profile/clutch/emotes/helmet-thumbs-up.png",
    icon: "trophy",
    gradient: ["#1d4ed8", "#f8fafc"],
  },
];

export const emoteCatalog: EmoteCatalogItem[] = emoteRows.map((row) => ({
  id: `${row.skinId}-${row.slug}`,
  mascotId: row.mascotId,
  skinId: row.skinId,
  name: row.name,
  lockedByDefault: row.slug !== "thumbs-up",
  unlockRequirement: emoteUnlockLabel(row.slug),
  thumbnailPath: row.asset,
  isPlaceholder: true,
  icon: row.icon,
  gradient: row.gradient,
  unlockPoints: emoteUnlockPoints(row.slug),
  autoUnlockAt: emoteAutoUnlockAt(row.slug),
  unlockLabel: emoteUnlockLabel(row.slug),
  finalWeekUnlock: true,
}));

export function getEmotesForSkin(skinId?: string | null) {
  const matches = emoteCatalog.filter((emote) => emote.skinId === skinId);
  return matches.length > 0 ? matches : emoteCatalog.slice(0, 3);
}

export function getDefaultEmoteForSkin(skinId?: string | null) {
  return getEmotesForSkin(skinId)[0] ?? emoteCatalog[0];
}

export function findEmoteById(id?: string | null) {
  return emoteCatalog.find((emote) => emote.id === id) ?? emoteCatalog[0];
}

function emoteUnlockPoints(slug: string) {
  if (slug === "roar") return 20;
  if (slug === "heartbreak") return 45;
  return 0;
}

function emoteAutoUnlockAt(slug: string) {
  if (slug === "roar") return AUTO_UNLOCK_WEEK_ONE_AT;
  if (slug === "heartbreak") return AUTO_UNLOCK_WEEK_TWO_AT;
  return null;
}

function emoteUnlockLabel(slug: string) {
  if (slug === "roar") return "Unlocks at 20 pts or Jun 18.";
  if (slug === "heartbreak") return "Unlocks at 45 pts or Jun 24.";
  return "Unlocked with this skin.";
}
