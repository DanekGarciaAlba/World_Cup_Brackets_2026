import { getSystemStatus } from "@/lib/system/status";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { MatchPredictionCard } from "@/components/picks/MatchPredictionCard";
import { Badge } from "@/components/ui/badge";
import { leaderboard, fixtures } from "@/lib/demo-data";

export default async function DashboardPage() {
  const status = await getSystemStatus();

  return (
    <div>
      <DashboardHero />
      <DashboardMetrics />

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">Next picks</p>
              <p className="text-sm text-muted-foreground">High-priority fixtures ready to stage</p>
            </div>
            <Badge variant="secondary">Kickoff locks</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {fixtures.slice(0, 2).map((fixture) => (
              <MatchPredictionCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </div>
        <ActivityFeed />
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">Top of the table</p>
            <p className="text-sm text-muted-foreground">Preview from leaderboard cache</p>
          </div>
          <Badge className="bg-primary text-primary-foreground">Live ready</Badge>
        </div>
        <LeaderboardPodium entries={leaderboard} />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {status.map((item) => (
          <article className="app-panel rounded-lg p-4" key={`${item.service}-${item.check}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{item.check}</p>
              <Badge variant={item.status === "PASS" ? "default" : item.status === "FAIL" ? "destructive" : "secondary"}>
                {item.status}
              </Badge>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.service}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.notes}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
