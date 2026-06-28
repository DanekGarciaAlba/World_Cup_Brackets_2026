import { resolveMatchStageMultiplier } from "./timing";

export const MATCH_SCORING_RULES = [
  { code: "correct_outcome", label: "Correct outcome/advancer", points: 4, tone: "green", description: "Win, draw, loss, or knockout advancer is right." },
  { code: "exact_score", label: "Exact score", points: 6, tone: "gold", description: "Both team scores are exact." },
  { code: "goal_difference", label: "Goal difference", points: 2, tone: "blue", description: "Margin is right, even if the total is not." },
  { code: "home_goals", label: "Team A goals", points: 1, tone: "blue", description: "Team A score is exact." },
  { code: "away_goals", label: "Team B goals", points: 1, tone: "blue", description: "Team B score is exact." },
] as const;

export const POINT_SYSTEM_SECTIONS = [
  {
    title: "Score Picks",
    badge: "Premium",
    tone: "gold",
    summary: "Highest ceiling because exact scores submitted early are the hardest public prediction.",
    rows: [
      ["Exact group score", "up to 18 pts", "14 base points at the best 1.35x timing multiplier."],
      ["Exact final score", "up to 23 pts", "Final and third-place match picks receive a 1.25x stage multiplier."],
      ["Close score", "scaled by timing", "Correct outcome plus margin and team-goal bonuses."],
      ["Early timing", "1.35x to 0.60x", "Latest meaningful edit time decides the multiplier."],
      ["Wrong outcome", "0 pts", "No negative scoring."],
    ],
  },
  {
    title: "Knockout Bracket",
    badge: "Progression",
    tone: "blue",
    summary: "Round of 32 matches lock one by one, and later path values drop only as that branch becomes known.",
    rows: [
      ["Champion", "+60", "Most valuable path pick when saved blind."],
      ["Finalists", "+25 each", "A team predicted and confirmed to reach the final."],
      ["Semi-finals", "+14 each", "A team predicted and confirmed to reach the semi-finals."],
      ["Quarter-finals", "+8 each", "A team predicted and confirmed to reach the quarter-finals."],
      ["Round of 16", "+4 each", "A team predicted and confirmed to survive the Round of 32."],
      ["Perfect R32", "+30", "All 16 Round of 32 winners saved before kickoff."],
      ["Timing", "branch adjusted", "Late saves lose value only where match results are already known."],
    ],
  },
  {
    title: "Group Ranking",
    badge: "Foundation",
    tone: "green",
    summary: "Each group has its own timestamp and gets less valuable after that group starts playing.",
    rows: [
      ["Before group starts", "6 / 4 / 3", "Correct 1st, 2nd, and 3rd before either group opener."],
      ["After one opener", "4 / 3 / 2", "Correct 1st, 2nd, and 3rd after one first-round match starts."],
      ["After both openers", "3 / 2 / 1", "Correct 1st, 2nd, and 3rd before the global group cutoff."],
      ["Cutoff", "0 if late", "Late group saves are rejected and old valid picks stay saved."],
    ],
  },
  {
    title: "Top 8 Third-Place",
    badge: "Direct picks",
    tone: "green",
    summary: "Pick eight teams you think will finish third and qualify. Each correct team scores by the fixed point window when that group pick was saved.",
    rows: [
      ["Open / Jun 18", "+9 each", "Each correct selected team saved from Top 8 open."],
      ["Jun 20", "+8 each", "Each correct selected team saved from Jun 20, 10:00 AM ET."],
      ["Jun 22", "+6 each", "Each correct selected team saved from Jun 22, 10:00 AM ET."],
      ["Jun 23", "+4 each", "Each correct selected team saved from Jun 23, 10:00 AM ET."],
      ["Jun 24 before lock", "+3 each", "Each correct selected team saved before the 3:00 PM ET global lock."],
      ["Perfect bonus", "+10", "Only for 8 out of 8."],
      ["Lock", "Jun 24, 3:00 PM ET", "At or after lock, new Top 8 saves are ineligible."],
    ],
  },
] as const;

export function getMatchProjectedMax(_boostApplied: boolean, stage?: string | null) {
  return Math.floor(14 * 135 * resolveMatchStageMultiplier(stage).multiplierBP / 10000);
}
