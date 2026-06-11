import type { MascotId } from "@/lib/mascots/mascotCatalog";
import { findEmoteById } from "@/lib/emotes/emoteCatalog";
import { findKitById } from "@/lib/kits/kitCatalog";
import { findPinById, pinCatalog } from "@/lib/emotes/pinCatalog";
import { mascotCatalog } from "@/lib/mascots/mascotCatalog";
import { findSkinById, getDefaultSkinForMascot } from "@/lib/mascots/skinCatalog";

export type DemoUser = {
  id: string;
  displayName: string;
  email?: string;
  handle: string;
  crew: string;
  city: string;
  mascotId: MascotId;
  skinId: string;
  emoteId: string;
  kitId: string;
  pinId: string;
  champion: string;
  form: string;
  stats: {
    rank: number;
    rankChange: number;
    totalPoints: number;
    todayPoints?: number;
    matchPoints: number;
    groupPoints: number;
    bracketPoints: number;
    bonusPoints: number;
    exactScores: number;
    correctOutcomes: number;
    currentCorrectStreak: number;
    bestCorrectStreak: number;
  };
  pickPattern: readonly [number, number][];
};

const starterDemoUsers: DemoUser[] = [
  {
    id: "mia-calderon",
    displayName: "Mia Calderon",
    handle: "@miagoal",
    crew: "Matchday Analysts",
    city: "Toronto",
    mascotId: "zayu",
    skinId: "zayu-verde-sombrero",
    emoteId: "zayu-verde-sombrero-roar",
    kitId: "mexico",
    pinId: "perfect-matchday",
    champion: "Mexico",
    form: "5 correct in last 6",
    stats: { rank: 1, rankChange: 3, totalPoints: 184, matchPoints: 91, groupPoints: 42, bracketPoints: 38, bonusPoints: 13, exactScores: 9, correctOutcomes: 31, currentCorrectStreak: 5, bestCorrectStreak: 8 },
    pickPattern: [[2, 1], [1, 1], [3, 0], [1, 0], [2, 2], [0, 1]],
  },
  {
    id: "leo-martin",
    displayName: "Leo Martin",
    handle: "@leolocks",
    crew: "Late Drama FC",
    city: "New York",
    mascotId: "clutch",
    skinId: "clutch-stars-top-hat",
    emoteId: "clutch-stars-top-hat-thumbs-up",
    kitId: "united-states",
    pinId: "mini-league-leader",
    champion: "United States",
    form: "Exact score specialist",
    stats: { rank: 2, rankChange: -1, totalPoints: 176, matchPoints: 88, groupPoints: 39, bracketPoints: 34, bonusPoints: 15, exactScores: 11, correctOutcomes: 28, currentCorrectStreak: 2, bestCorrectStreak: 7 },
    pickPattern: [[1, 0], [2, 1], [1, 2], [2, 0], [0, 0], [3, 1]],
  },
  {
    id: "ava-thompson",
    displayName: "Ava Thompson",
    handle: "@avasheet",
    crew: "Clean Sheet Club",
    city: "Vancouver",
    mascotId: "maple",
    skinId: "maple-white-captain",
    emoteId: "maple-white-captain-thumbs-up",
    kitId: "canada",
    pinId: "clean-sheet",
    champion: "Canada",
    form: "Defensive reads",
    stats: { rank: 3, rankChange: 5, totalPoints: 169, matchPoints: 83, groupPoints: 36, bracketPoints: 37, bonusPoints: 13, exactScores: 8, correctOutcomes: 29, currentCorrectStreak: 4, bestCorrectStreak: 6 },
    pickPattern: [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [2, 1]],
  },
  {
    id: "noah-kim",
    displayName: "Noah Kim",
    handle: "@noko",
    crew: "Bracket Room",
    city: "Los Angeles",
    mascotId: "clutch",
    skinId: "clutch-helmet-home",
    emoteId: "clutch-helmet-home-roar",
    kitId: "argentina",
    pinId: "bracket-alive",
    champion: "Argentina",
    form: "Bracket still perfect",
    stats: { rank: 4, rankChange: 1, totalPoints: 162, matchPoints: 72, groupPoints: 38, bracketPoints: 43, bonusPoints: 9, exactScores: 6, correctOutcomes: 27, currentCorrectStreak: 3, bestCorrectStreak: 5 },
    pickPattern: [[2, 0], [2, 2], [1, 0], [1, 3], [2, 1], [1, 1]],
  },
  {
    id: "sofia-reyes",
    displayName: "Sofia Reyes",
    handle: "@sofiapicks",
    crew: "Golden Boot Board",
    city: "Guadalajara",
    mascotId: "zayu",
    skinId: "zayu-black-gold",
    emoteId: "zayu-black-gold-thumbs-up",
    kitId: "spain",
    pinId: "champion-pick",
    champion: "Spain",
    form: "Early saver",
    stats: { rank: 5, rankChange: 4, totalPoints: 157, matchPoints: 79, groupPoints: 31, bracketPoints: 35, bonusPoints: 12, exactScores: 7, correctOutcomes: 26, currentCorrectStreak: 4, bestCorrectStreak: 7 },
    pickPattern: [[3, 1], [1, 0], [2, 1], [2, 2], [1, 1], [0, 1]],
  },
  {
    id: "ethan-wright",
    displayName: "Ethan Wright",
    handle: "@etwinner",
    crew: "Group Table Crew",
    city: "Seattle",
    mascotId: "maple",
    skinId: "maple-ice-guard",
    emoteId: "maple-ice-guard-roar",
    kitId: "france",
    pinId: "group-winner",
    champion: "France",
    form: "Group call heater",
    stats: { rank: 6, rankChange: -2, totalPoints: 151, matchPoints: 70, groupPoints: 45, bracketPoints: 28, bonusPoints: 8, exactScores: 5, correctOutcomes: 25, currentCorrectStreak: 1, bestCorrectStreak: 6 },
    pickPattern: [[1, 2], [2, 0], [1, 1], [0, 0], [3, 2], [2, 0]],
  },
  {
    id: "isla-bennett",
    displayName: "Isla Bennett",
    handle: "@isla90",
    crew: "Rival Watch",
    city: "London",
    mascotId: "clutch",
    skinId: "clutch-gold-striker",
    emoteId: "clutch-gold-striker-roar",
    kitId: "england",
    pinId: "rival-slayer",
    champion: "England",
    form: "Won 3 rival weeks",
    stats: { rank: 7, rankChange: 2, totalPoints: 146, matchPoints: 75, groupPoints: 28, bracketPoints: 31, bonusPoints: 12, exactScores: 6, correctOutcomes: 24, currentCorrectStreak: 2, bestCorrectStreak: 5 },
    pickPattern: [[2, 1], [0, 1], [2, 0], [1, 1], [1, 0], [2, 2]],
  },
  {
    id: "mateo-silva",
    displayName: "Mateo Silva",
    handle: "@matcalls",
    crew: "Underdog Desk",
    city: "Miami",
    mascotId: "zayu",
    skinId: "zayu-lucha-white",
    emoteId: "zayu-lucha-white-roar",
    kitId: "brazil",
    pinId: "underdog-call",
    champion: "Brazil",
    form: "Two upsets landed",
    stats: { rank: 8, rankChange: 6, totalPoints: 141, matchPoints: 69, groupPoints: 29, bracketPoints: 33, bonusPoints: 10, exactScores: 4, correctOutcomes: 23, currentCorrectStreak: 3, bestCorrectStreak: 4 },
    pickPattern: [[0, 1], [2, 1], [3, 2], [0, 2], [1, 1], [2, 1]],
  },
  {
    id: "olivia-chen",
    displayName: "Olivia Chen",
    handle: "@oliveclimb",
    crew: "Comeback Crew",
    city: "San Francisco",
    mascotId: "maple",
    skinId: "maple-classic-home",
    emoteId: "maple-classic-home-roar",
    kitId: "portugal",
    pinId: "comeback",
    champion: "Portugal",
    form: "Climbed 11 spots",
    stats: { rank: 9, rankChange: 11, totalPoints: 137, matchPoints: 66, groupPoints: 33, bracketPoints: 27, bonusPoints: 11, exactScores: 5, correctOutcomes: 22, currentCorrectStreak: 2, bestCorrectStreak: 5 },
    pickPattern: [[1, 0], [3, 1], [0, 0], [2, 1], [2, 0], [1, 2]],
  },
  {
    id: "jack-murphy",
    displayName: "Jack Murphy",
    handle: "@jackexact",
    crew: "Scoreline Syndicate",
    city: "Boston",
    mascotId: "clutch",
    skinId: "clutch-helmet-home",
    emoteId: "clutch-helmet-home-thumbs-up",
    kitId: "germany",
    pinId: "exact-score",
    champion: "Germany",
    form: "Four exact scores",
    stats: { rank: 10, rankChange: -3, totalPoints: 132, matchPoints: 71, groupPoints: 24, bracketPoints: 29, bonusPoints: 8, exactScores: 7, correctOutcomes: 21, currentCorrectStreak: 1, bestCorrectStreak: 4 },
    pickPattern: [[2, 2], [1, 0], [1, 1], [3, 0], [0, 1], [2, 1]],
  },
];

const extraNames = [
  "Priya Nair",
  "Daniel Brooks",
  "Camila Duarte",
  "Sam Rivera",
  "Nora Patel",
  "Andre Costa",
  "Lena Fischer",
  "Theo Alvarez",
  "Grace Okafor",
  "Ben Carter",
  "Amara Wilson",
  "Julian Park",
  "Nina Rossi",
  "Miles Grant",
  "Elena Novak",
  "Owen Hughes",
  "Layla Mansour",
  "Victor Chen",
  "Hana Sato",
  "Caleb Price",
];

const mascotLoadouts = [
  ["maple", "maple-starter", "maple-starter-thumbs-up", "canada"],
  ["zayu", "zayu-starter", "zayu-starter-roar", "mexico"],
  ["clutch", "clutch-starter", "clutch-starter-thumbs-up", "united-states"],
  ["maple", "maple-ice-guard", "maple-ice-guard-roar", "france"],
  ["zayu", "zayu-black-gold", "zayu-black-gold-thumbs-up", "brazil"],
  ["clutch", "clutch-gold-striker", "clutch-gold-striker-roar", "england"],
] as const;

const pinIds = ["exact-score", "group-winner", "comeback", "clean-sheet", "underdog-call", "rival-slayer"] as const;
const champions = ["Canada", "Mexico", "United States", "Brazil", "France", "England", "Spain", "Argentina"];

const generatedDemoUsers: DemoUser[] = extraNames.map((name, index) => {
  const rank = index + starterDemoUsers.length + 1;
  const [mascotId, skinId, emoteId, kitId] = mascotLoadouts[index % mascotLoadouts.length];
  const totalPoints = 128 - index * 4;
  const first = name.split(" ")[0].toLowerCase();
  const last = name.split(" ")[1].toLowerCase();

  return {
    id: `${first}-${last}`,
    displayName: name,
    email: `${first}.${last}@tgp.build`,
    handle: `@${first}${rank}`,
    crew: ["Fixture Lab", "Office XI", "Bracket Room", "Match Desk", "North Stand"][index % 5],
    city: ["Toronto", "Austin", "Chicago", "Montreal", "Denver"][index % 5],
    mascotId,
    skinId,
    emoteId,
    kitId,
    pinId: pinIds[index % pinIds.length],
    champion: champions[index % champions.length],
    form: index % 2 === 0 ? "Rising this week" : "Steady points pace",
    stats: {
      rank,
      rankChange: (index % 7) - 3,
      totalPoints,
      todayPoints: 24 - (index % 9),
      matchPoints: Math.max(42, totalPoints - 58),
      groupPoints: 18 + (index % 14),
      bracketPoints: 22 + (index % 18),
      bonusPoints: 4 + (index % 9),
      exactScores: 3 + (index % 7),
      correctOutcomes: 16 + (index % 12),
      currentCorrectStreak: 1 + (index % 5),
      bestCorrectStreak: 4 + (index % 6),
    },
    pickPattern: [
      [1 + (index % 3), index % 2],
      [2, 1 + (index % 2)],
      [index % 2, 0],
      [1, 1],
      [3, 1],
      [2, 2],
    ],
  };
});

export const demoUsers: DemoUser[] = [...starterDemoUsers, ...generatedDemoUsers].map((user, index) => ({
  ...user,
  email: user.email ?? `${user.displayName.toLowerCase().replace(/\s+/g, ".")}@tgp.build`,
  stats: {
    ...user.stats,
    todayPoints: user.stats.todayPoints ?? Math.max(8, 28 - index),
  },
}));

export type DemoClub = {
  id: string;
  name: string;
  code: string;
  memberIds: string[];
  rankChange: number;
};

export const demoClubs: DemoClub[] = [
  { id: "north-stand", name: "North Stand Syndicate", code: "NORTH26", memberIds: demoUsers.slice(0, 8).map((user) => user.id), rankChange: 2 },
  { id: "fixture-lab", name: "Fixture Lab FC", code: "FIXLAB", memberIds: demoUsers.slice(5, 15).map((user) => user.id), rankChange: 4 },
  { id: "golden-boot", name: "Golden Boot Board", code: "GOLD10", memberIds: demoUsers.slice(10, 20).map((user) => user.id), rankChange: -1 },
  { id: "late-drama", name: "Late Drama Club", code: "LATE90", memberIds: demoUsers.slice(15, 25).map((user) => user.id), rankChange: 1 },
  { id: "clean-sheet", name: "Clean Sheet Crew", code: "SHEET5", memberIds: demoUsers.slice(20, 30).map((user) => user.id), rankChange: -2 },
];

export function getDemoEmail(user: DemoUser) {
  return user.email ?? `${user.displayName.toLowerCase().replace(/\s+/g, ".")}@tgp.build`;
}

export function getDemoTodayPoints(user: DemoUser) {
  return user.stats.todayPoints ?? 0;
}

export function getDemoClub(clubId?: string | null) {
  return demoClubs.find((club) => club.id === clubId) ?? demoClubs[0];
}

export function getDemoClubMembers(club: DemoClub) {
  return club.memberIds
    .map((id) => getDemoUserById(id))
    .filter(Boolean)
    .sort((a, b) => b!.stats.totalPoints - a!.stats.totalPoints) as DemoUser[];
}

export function getDemoClubStats(club: DemoClub) {
  const members = getDemoClubMembers(club);
  const totalPoints = members.slice(0, 10).reduce((sum, user) => sum + user.stats.totalPoints, 0);
  const correctPredictions = members.reduce((sum, user) => sum + user.stats.correctOutcomes, 0);
  return {
    members,
    totalPoints,
    correctPredictions,
    averagePoints: members.length > 0 ? Math.round(totalPoints / members.length) : 0,
  };
}

export function getDemoRankedClubs() {
  return demoClubs
    .map((club) => {
      const stats = getDemoClubStats(club);
      return { ...club, ...stats };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((club, index) => ({ ...club, rank: index + 1 }));
}

export function searchDemoUsers(query?: string | null) {
  const text = (query ?? "").trim().toLowerCase();
  if (!text) return demoUsers;
  return demoUsers.filter((user) => getDemoEmail(user).toLowerCase().includes(text) || user.displayName.toLowerCase().includes(text));
}

export function searchDemoClubs({ q, personEmail }: { q?: string | null; personEmail?: string | null }) {
  const clubText = (q ?? "").trim().toLowerCase();
  const emailText = (personEmail ?? "").trim().toLowerCase();
  return getDemoRankedClubs().filter((club) => {
    const matchesClub = !clubText || club.name.toLowerCase().includes(clubText) || club.code.toLowerCase().includes(clubText);
    const matchesPerson =
      !emailText || club.members.some((user) => getDemoEmail(user).toLowerCase().includes(emailText) || user.displayName.toLowerCase().includes(emailText));
    return matchesClub && matchesPerson;
  });
}

export function getDemoDailyHighlights() {
  return demoUsers.slice(0, 10).map((user, index) => ({
    id: `daily-${user.id}`,
    rank: index + 1,
    user,
    match: ["Canada vs Mexico", "Brazil vs England", "USA vs Germany", "France vs Spain", "Argentina vs Portugal"][index % 5],
    predictedScore: `${2 + (index % 2)}-${index % 3}`,
    points: 18 - (index % 6),
    exact: index % 3 === 0,
    time: ["9:05 AM", "9:18 AM", "10:02 AM", "10:24 AM", "11:10 AM", "11:36 AM", "12:08 PM", "12:44 PM", "1:15 PM", "1:42 PM"][index],
  }));
}

export function getDemoMyPredictions(user = demoUsers[0]) {
  return ["Canada vs Mexico", "Brazil vs England", "USA vs Germany", "France vs Spain", "Argentina vs Portugal", "Japan vs Morocco"].map((match, index) => {
    const [home, away] = user.pickPattern[index % user.pickPattern.length];
    return {
      id: `${user.id}-pick-${index}`,
      match,
      score: `${home}-${away}`,
      status: index < 2 ? "Final" : index === 2 ? "Live" : "Editable",
      points: index < 2 ? 12 - index * 3 : null,
    };
  });
}

export function getDemoActivity() {
  return [
    "Mia jumped to #1 with an exact score.",
    "North Stand Syndicate passed 1,100 club points.",
    "Leo added a late correct outcome.",
    "Fixture Lab FC gained four ranks today.",
    "Ava landed a clean-sheet prediction.",
    "Golden Boot Board added two members.",
    "Noah's bracket path stayed alive.",
    "Sofia saved tomorrow's picks early.",
  ].map((message, index) => ({ id: `activity-${index}`, message, time: `${index + 2}m ago` }));
}

export function getDemoUser(userId?: string | null) {
  return demoUsers.find((user) => user.id === userId) ?? demoUsers[0];
}

export function getDemoUserById(userId: string) {
  return demoUsers.find((user) => user.id === userId) ?? null;
}

export function getDemoProfileAssets(user: DemoUser) {
  const mascot = mascotCatalog[user.mascotId];
  const skin = findSkinById(user.skinId) ?? getDefaultSkinForMascot(user.mascotId);
  const emote = findEmoteById(user.emoteId);
  const kit = findKitById(user.kitId);
  const pin = findPinById(user.pinId);
  const unlockedPins = [pin, ...pinCatalog.filter((item) => item.id !== pin.id && !item.lockedByDefault)].slice(0, 4);

  return { mascot, skin, emote, kit, pin, unlockedPins };
}

export function getDemoPick(user: DemoUser, index: number) {
  const [homeScore, awayScore] = user.pickPattern[index % user.pickPattern.length] ?? [1, 1];
  return {
    homeScore,
    awayScore,
    boostApplied: (user.stats.rank + index) % 3 === 0,
    confidence: Math.max(62, 96 - index * 5 - user.stats.rank),
  };
}
