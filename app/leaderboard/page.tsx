import { BiggestMoverCard } from "@/components/leaderboard/BiggestMoverCard";
import { ExactScoreKingCard } from "@/components/leaderboard/ExactScoreKingCard";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { MiniLeagueLeaderboard } from "@/components/leaderboard/MiniLeagueLeaderboard";
import { MobileLeaderboardCards } from "@/components/leaderboard/MobileLeaderboardCards";
import { PremiumLeaderboardTable } from "@/components/leaderboard/PremiumLeaderboardTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const data = await getWorldCupDashboardData();

  return (
    <div>
      <PageHeader
        eyebrow="Leaderboard"
        title="Standings with trophy energy."
        description="Leaderboard rows come from scoring cache only. Empty cache means no invented people or points."
        badge={`${data.leaderboard.length} rows`}
      />
      <div className="grid gap-5">
        {data.leaderboard.length > 0 ? <LeaderboardPodium entries={data.leaderboard} /> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <ExactScoreKingCard entries={data.leaderboard} />
          <BiggestMoverCard />
          <MiniLeagueLeaderboard />
        </div>
        <MobileLeaderboardCards entries={data.leaderboard} />
        <PremiumLeaderboardTable entries={data.leaderboard} />
      </div>
    </div>
  );
}
