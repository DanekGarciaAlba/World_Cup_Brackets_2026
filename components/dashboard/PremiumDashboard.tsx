import { TopBar } from "@/components/layout/TopBar";
import type { DashboardData } from "@/lib/data/worldCupData";
import { AvatarPlaceholderCard } from "./AvatarPlaceholderCard";
import { BoostAvailableCard } from "./BoostAvailableCard";
import { BracketHealthCard } from "./BracketHealthCard";
import { GroupActivityFeed } from "./GroupActivityFeed";
import { LeaderboardPodiumCard } from "./LeaderboardPodiumCard";
import { LiveMatchCard } from "./LiveMatchCard";
import { MyGroupsCard } from "./MyGroupsCard";
import { MyRankCard } from "./MyRankCard";
import { NextPickDeadlineCard } from "./NextPickDeadlineCard";
import { TrophyPointsCard } from "./TrophyPointsCard";

export function PremiumDashboard({ data }: { data: DashboardData }) {
  return (
    <div>
      <TopBar />
      <section className="stadium-card premium-card mb-5 p-4 sm:p-5 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <NextPickDeadlineCard match={data.nextMatches[0] ?? null} />
          <MyRankCard leaderboard={data.leaderboard} />
          <TrophyPointsCard leaderboard={data.leaderboard} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <LiveMatchCard match={data.liveMatch} />
          <AvatarPlaceholderCard avatar={data.currentUserAvatar} />
          <LeaderboardPodiumCard entries={data.leaderboard} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <MyGroupsCard groups={data.groups} />
          <GroupActivityFeed activity={data.activity} />
          <BracketHealthCard quality={data.quality} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <BoostAvailableCard quality={data.quality} />
        <section className="premium-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Data integrity</p>
          <p className="mt-6 text-2xl font-semibold">{data.quality.lastValidationStatus}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Production UI reads synced Supabase data only. Missing groups, fixtures, standings, or brackets show sync states.
          </p>
        </section>
      </section>
    </div>
  );
}
