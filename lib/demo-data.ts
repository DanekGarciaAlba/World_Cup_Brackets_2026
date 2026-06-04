export type Team = {
  id: number;
  name: string;
  code: string;
  group: string;
  color: string;
};

export type Fixture = {
  id: number;
  group: string;
  round: string;
  kickoff: string;
  venue: string;
  home: Team;
  away: Team;
  lockState: "open" | "soon" | "locked";
  liveMinute?: number;
};

export type LeaderboardEntry = {
  rank: number;
  previousRank: number;
  name: string;
  team: string;
  points: number;
  exacts: number;
  bracket: number;
  streak: number;
  avatarTone: string;
  kit: string;
};

export const teams: Team[] = [
  { id: 1, name: "Canada", code: "CAN", group: "A", color: "#d9273e" },
  { id: 2, name: "Mexico", code: "MEX", group: "A", color: "#1fb36a" },
  { id: 3, name: "South Korea", code: "KOR", group: "A", color: "#3466d9" },
  { id: 4, name: "Morocco", code: "MAR", group: "A", color: "#c9213a" },
  { id: 5, name: "United States", code: "USA", group: "B", color: "#294ed8" },
  { id: 6, name: "Japan", code: "JPN", group: "B", color: "#e8eef6" },
  { id: 7, name: "Senegal", code: "SEN", group: "B", color: "#26a96c" },
  { id: 8, name: "Australia", code: "AUS", group: "B", color: "#f7c948" },
  { id: 9, name: "Brazil", code: "BRA", group: "C", color: "#f7c948" },
  { id: 10, name: "France", code: "FRA", group: "C", color: "#2c66d8" },
  { id: 11, name: "Portugal", code: "POR", group: "C", color: "#bd2439" },
  { id: 12, name: "Netherlands", code: "NED", group: "C", color: "#ef742f" },
  { id: 13, name: "Argentina", code: "ARG", group: "D", color: "#65b9f2" },
  { id: 14, name: "Spain", code: "ESP", group: "D", color: "#d82f35" },
  { id: 15, name: "Germany", code: "GER", group: "D", color: "#f6f1df" },
  { id: 16, name: "England", code: "ENG", group: "D", color: "#f1f7ff" },
];

export const groups = ["A", "B", "C", "D"].map((group) => ({
  group,
  teams: teams.filter((team) => team.group === group),
}));

export const fixtures: Fixture[] = [
  {
    id: 101,
    group: "A",
    round: "Group match 1",
    kickoff: "Jun 11, 2026 20:00",
    venue: "Mexico City",
    home: teams[1],
    away: teams[0],
    lockState: "open",
  },
  {
    id: 102,
    group: "B",
    round: "Group match 1",
    kickoff: "Jun 12, 2026 18:00",
    venue: "Los Angeles",
    home: teams[4],
    away: teams[5],
    lockState: "soon",
  },
  {
    id: 103,
    group: "C",
    round: "Group match 2",
    kickoff: "Jun 14, 2026 16:00",
    venue: "Toronto",
    home: teams[8],
    away: teams[9],
    lockState: "open",
  },
  {
    id: 104,
    group: "D",
    round: "Group match 2",
    kickoff: "Jun 15, 2026 21:00",
    venue: "New York/New Jersey",
    home: teams[12],
    away: teams[13],
    lockState: "open",
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, previousRank: 3, name: "Maya Chen", team: "Finance FC", points: 184, exacts: 8, bracket: 42, streak: 5, avatarTone: "#b98962", kit: "#35e0a1" },
  { rank: 2, previousRank: 1, name: "Danek Garcia", team: "Ops United", points: 179, exacts: 7, bracket: 38, streak: 3, avatarTone: "#d1a178", kit: "#62b5ff" },
  { rank: 3, previousRank: 4, name: "Sam Patel", team: "Design XI", points: 171, exacts: 6, bracket: 44, streak: 4, avatarTone: "#8f5f3e", kit: "#f7c948" },
  { rank: 4, previousRank: 2, name: "Lena Brooks", team: "Sales City", points: 166, exacts: 6, bracket: 32, streak: 2, avatarTone: "#c58a62", kit: "#ff7a90" },
  { rank: 5, previousRank: 7, name: "Omar Hassan", team: "Support Town", points: 159, exacts: 5, bracket: 35, streak: 4, avatarTone: "#77462f", kit: "#b69cff" },
  { rank: 6, previousRank: 5, name: "Nina Torres", team: "Product Rovers", points: 151, exacts: 4, bracket: 36, streak: 1, avatarTone: "#a76c45", kit: "#24d6c6" },
];

export const activity = [
  { name: "Maya Chen", action: "hit an exact score", detail: "Mexico 2 - Canada 1", time: "8 min ago" },
  { name: "Danek Garcia", action: "locked a bracket path", detail: "Canada to the quarterfinals", time: "18 min ago" },
  { name: "Sam Patel", action: "joined a mini-league", detail: "North Office Cup", time: "41 min ago" },
  { name: "Lena Brooks", action: "moved up two spots", detail: "Sales City is now rank 4", time: "1 hr ago" },
];

export const bracketRounds = [
  {
    name: "Round of 32",
    matches: [
      ["Winner A", "3rd B/C/D"],
      ["Winner B", "Runner-up A"],
      ["Winner C", "Runner-up D"],
      ["Winner D", "3rd A/B/C"],
    ],
  },
  {
    name: "Round of 16",
    matches: [
      ["Canada", "United States"],
      ["Brazil", "Netherlands"],
    ],
  },
  {
    name: "Quarterfinals",
    matches: [
      ["Canada", "Brazil"],
      ["Argentina", "France"],
    ],
  },
  {
    name: "Semifinals",
    matches: [["Canada", "Argentina"]],
  },
  {
    name: "Final",
    matches: [["Canada", "France"]],
  },
];
