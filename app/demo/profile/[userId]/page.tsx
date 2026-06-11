import { notFound } from "next/navigation";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getDemoPick, getDemoProfileAssets, getDemoUserById, type DemoUser } from "@/lib/demo/demoEnvironment";
import { getWorldCupDashboardData, type MatchSummary } from "@/lib/data/worldCupData";
import type { PublicPredictionPreview } from "@/lib/privacy/publicPredictionPreview";
import type { ProfileBracketSummary, ProfileBracketTeam } from "@/lib/profile/bracketSummary";

export const dynamic = "force-dynamic";

type DemoProfilePageProps = {
  params: Promise<{ userId: string }> | { userId: string };
};

export default async function DemoProfilePage({ params }: DemoProfilePageProps) {
  const { userId } = await params;
  const user = getDemoUserById(userId);
  if (!user) notFound();

  const data = await getWorldCupDashboardData();
  const matches = selectDemoProfileMatches(data.matches);
  const { kit } = getDemoProfileAssets(user);

  return (
    <PublicProfileView
      profile={{
        displayName: user.displayName,
        department: user.crew,
        favoriteCountry: user.city,
        subtitle: `${user.handle} / ${user.crew} / ${user.city}`,
      }}
      avatar={{
        avatarBase: user.skinId,
        celebrationStyle: user.emoteId,
        badgeShape: user.pinId,
        kitId: kit.id,
      }}
      mascot={{
        selectedMascot: user.mascotId,
        unlockedCount: 3,
        currentCorrectStreak: user.stats.currentCorrectStreak,
        bestCorrectStreak: user.stats.bestCorrectStreak,
      }}
      stats={{
        rank: user.stats.rank,
        totalPoints: user.stats.totalPoints,
        matchPoints: user.stats.matchPoints,
        groupPoints: user.stats.groupPoints,
        bracketPoints: user.stats.bracketPoints,
        bonusPoints: user.stats.bonusPoints,
        exactScores: user.stats.exactScores,
        correctOutcomes: user.stats.correctOutcomes,
      }}
      bracketSummary={buildDemoBracketSummary(user)}
      predictionPreview={matches.map((match, index) => demoPredictionPreview(user, match, index))}
      headerEyebrow="Fake public profile"
      backHref="/demo"
      backLabel="Demo Top 10"
      actionHref={`/demo/picks?user=${user.id}`}
      actionLabel="View Picks"
    />
  );
}

function demoPredictionPreview(user: DemoUser, match: MatchSummary, index: number): PublicPredictionPreview {
  const pick = getDemoPick(user, index);
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: pick.homeScore,
    awayScore: pick.awayScore,
    savedAt: "2026-06-08T18:30:00.000Z",
    revealAt: match.kickoffAt,
    revealed: true,
    status: match.status,
    matchLabel: match.groupName ?? match.stage ?? match.round ?? "Fixture",
  };
}

function selectDemoProfileMatches(matches: MatchSummary[]) {
  return matches
    .filter((match) => match.homeTeam && match.awayTeam)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(0, 24);
}

function demoTeam(id: number, name: string, code: string): ProfileBracketTeam {
  return { id, name, code, country: name };
}

function buildDemoBracketSummary(user: DemoUser): ProfileBracketSummary {
  const champion = demoTeam(1, user.champion, user.champion.slice(0, 3).toUpperCase());
  const netherlands = demoTeam(2, "Netherlands", "NED");
  const congo = demoTeam(3, "Congo DR", "CGO");
  const algeria = demoTeam(4, "Algeria", "ALG");
  const curacao = demoTeam(5, "Curacao", "CUR");
  const southAfrica = demoTeam(6, "South Africa", "RSA");
  const turkiye = demoTeam(7, "Turkiye", "TUR");
  const qatar = demoTeam(8, "Qatar", "QAT");

  return {
    savedAt: "2026-06-08T18:30:00.000Z",
    complete: true,
    pickedMatches: 32,
    champion,
    finalists: [champion, netherlands],
    semiFinalists: [champion, congo, netherlands, algeria],
    quarterFinalists: [champion, curacao, netherlands, southAfrica, congo, turkiye, algeria, qatar],
    thirdPlaceWinner: congo,
    topThirds: [
      demoTeam(9, "Mexico", "MEX"),
      demoTeam(10, "Canada", "CAN"),
      demoTeam(11, "Australia", "AUS"),
      demoTeam(12, "Germany", "GER"),
      demoTeam(13, "Sweden", "SWE"),
      demoTeam(14, "Spain", "ESP"),
      demoTeam(15, "Austria", "AUT"),
      demoTeam(16, "Ghana", "GHA"),
    ],
  };
}
