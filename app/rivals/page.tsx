import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MiniLeagueActions, RivalCard } from "@/components/rivals/RivalCard";

export default function RivalsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Rivals"
        title="Make mini-leagues feel alive."
        description="Create private tables, join by code, compare point gaps, and send lightweight reactions after big scoring swings."
        badge="Social tables added"
      />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4">
          <div className="app-panel rounded-lg p-4">
            <div className="mb-4">
              <p className="text-lg font-semibold">Mini-league controls</p>
              <p className="text-sm text-muted-foreground">Ready to connect to mini_leagues and mini_league_members.</p>
            </div>
            <MiniLeagueActions />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RivalCard name="Maya Chen" delta={5} league="North Office Cup" />
            <RivalCard name="Sam Patel" delta={-8} league="Design XI" />
            <RivalCard name="Lena Brooks" delta={12} league="Sales City" />
            <RivalCard name="Omar Hassan" delta={2} league="Support Town" />
          </div>
        </div>
        <ActivityFeed />
      </section>
    </div>
  );
}
