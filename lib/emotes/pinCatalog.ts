import { AUTO_UNLOCK_KNOCKOUT_AT, AUTO_UNLOCK_WEEK_ONE_AT, AUTO_UNLOCK_WEEK_TWO_AT } from "../mascots/unlocks";

export type PinCatalogItem = {
  id: string;
  name: string;
  lockedByDefault: boolean;
  unlockRequirement: string;
  icon: "score" | "winner" | "bracket" | "league" | "rival" | "matchday" | "champion" | "comeback" | "underdog" | "clean";
  gradient: [string, string];
  unlockPoints: number;
  autoUnlockAt: string | null;
  unlockLabel: string;
  finalWeekUnlock: boolean;
};

export const pinCatalog: PinCatalogItem[] = [
  {
    id: "exact-score",
    name: "Exact Score",
    lockedByDefault: false,
    unlockRequirement: "Unlocked by default.",
    icon: "score",
    gradient: ["#7fd2ff", "#273353"],
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Unlocked by default.",
    finalWeekUnlock: true,
  },
  {
    id: "group-winner",
    name: "Group Winner",
    lockedByDefault: false,
    unlockRequirement: "Correctly predict a group winner.",
    icon: "winner",
    gradient: ["#3aa66a", "#d8b157"],
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Unlocked by default.",
    finalWeekUnlock: true,
  },
  {
    id: "bracket-alive",
    name: "Bracket Alive",
    lockedByDefault: false,
    unlockRequirement: "Complete a knockout bracket path.",
    icon: "bracket",
    gradient: ["#6684ff", "#1d2b62"],
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Unlocked by default.",
    finalWeekUnlock: true,
  },
  {
    id: "mini-league-leader",
    name: "Mini-League Leader",
    lockedByDefault: false,
    unlockRequirement: "Reach the top of a mini-league.",
    icon: "league",
    gradient: ["#d8b157", "#6f4a12"],
    unlockPoints: 0,
    autoUnlockAt: null,
    unlockLabel: "Unlocked by default.",
    finalWeekUnlock: true,
  },
  {
    id: "rival-slayer",
    name: "Rival Slayer",
    lockedByDefault: true,
    unlockRequirement: "Win a rival comparison.",
    icon: "rival",
    gradient: ["#ff4d5f", "#43111b"],
    unlockPoints: 40,
    autoUnlockAt: AUTO_UNLOCK_WEEK_ONE_AT,
    unlockLabel: "Unlocks at 40 pts or Jun 18.",
    finalWeekUnlock: true,
  },
  {
    id: "perfect-matchday",
    name: "Perfect Matchday",
    lockedByDefault: true,
    unlockRequirement: "Get every match outcome right in a matchday.",
    icon: "matchday",
    gradient: ["#f5c94d", "#172554"],
    unlockPoints: 40,
    autoUnlockAt: AUTO_UNLOCK_WEEK_ONE_AT,
    unlockLabel: "Unlocks at 40 pts or Jun 18.",
    finalWeekUnlock: true,
  },
  {
    id: "champion-pick",
    name: "Champion Pick",
    lockedByDefault: true,
    unlockRequirement: "Pick the tournament champion before knockouts.",
    icon: "champion",
    gradient: ["#f2f4ff", "#243c86"],
    unlockPoints: 90,
    autoUnlockAt: AUTO_UNLOCK_WEEK_TWO_AT,
    unlockLabel: "Unlocks at 90 pts or Jun 24.",
    finalWeekUnlock: true,
  },
  {
    id: "comeback",
    name: "Comeback",
    lockedByDefault: true,
    unlockRequirement: "Climb 10 leaderboard spots.",
    icon: "comeback",
    gradient: ["#98d671", "#17331d"],
    unlockPoints: 90,
    autoUnlockAt: AUTO_UNLOCK_WEEK_TWO_AT,
    unlockLabel: "Unlocks at 90 pts or Jun 24.",
    finalWeekUnlock: true,
  },
  {
    id: "underdog-call",
    name: "Underdog Call",
    lockedByDefault: true,
    unlockRequirement: "Call a lower-ranked team result correctly.",
    icon: "underdog",
    gradient: ["#cf573c", "#111827"],
    unlockPoints: 150,
    autoUnlockAt: AUTO_UNLOCK_KNOCKOUT_AT,
    unlockLabel: "Unlocks at 150 pts or Jun 28.",
    finalWeekUnlock: true,
  },
  {
    id: "clean-sheet",
    name: "Clean Sheet",
    lockedByDefault: true,
    unlockRequirement: "Predict a shutout score exactly.",
    icon: "clean",
    gradient: ["#dbeafe", "#26375f"],
    unlockPoints: 150,
    autoUnlockAt: AUTO_UNLOCK_KNOCKOUT_AT,
    unlockLabel: "Unlocks at 150 pts or Jun 28.",
    finalWeekUnlock: true,
  },
];

export function findPinById(id?: string | null) {
  return pinCatalog.find((pin) => pin.id === id) ?? pinCatalog[0];
}
