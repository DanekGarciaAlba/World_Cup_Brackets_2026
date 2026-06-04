import { Handshake, Flame, MessageCircle, Swords } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityFeed } from "@/components/rivals/ActivityFeed";
import { CelebrationEmoteButton } from "@/components/rivals/CelebrationEmoteButton";
import { CreateLeagueDialog } from "@/components/rivals/CreateLeagueDialog";
import { JoinLeagueDialog } from "@/components/rivals/JoinLeagueDialog";
import { MiniLeagueCard } from "@/components/rivals/MiniLeagueCard";
import { RivalCard } from "@/components/rivals/RivalCard";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function RivalsPage() {
  const data = await getWorldCupDashboardData();

  return (
    <div>
      <PageHeader
        eyebrow="Rivals"
        title="Private tables, clean emotes."
        description="Mini-leagues and rival comparisons use real membership/activity data. Empty leagues stay empty."
        badge={`${data.miniLeagueCount} leagues`}
      />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4">
          <div className="premium-card p-5">
            <div className="mb-4">
              <p className="text-lg font-semibold">Mini-league controls</p>
              <p className="text-sm text-muted-foreground">Ready to connect to mini_leagues and mini_league_members.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CreateLeagueDialog />
              <JoinLeagueDialog />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <MiniLeagueCard count={data.miniLeagueCount} />
            <RivalCard />
          </div>
          <div className="premium-card p-5">
            <p className="mb-4 text-sm font-semibold">Predefined emotes</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <CelebrationEmoteButton label="Nice pick" icon={Handshake} />
              <CelebrationEmoteButton label="Close one" icon={Swords} />
              <CelebrationEmoteButton label="Hot streak" icon={Flame} />
              <CelebrationEmoteButton label="Comment" icon={MessageCircle} />
            </div>
          </div>
        </div>
        <ActivityFeed activity={data.activity} />
      </section>
    </div>
  );
}
