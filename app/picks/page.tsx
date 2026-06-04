import { Goal } from "lucide-react";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumMatchCard } from "@/components/matches/PremiumMatchCard";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const data = await getWorldCupDashboardData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const matchIds = data.nextMatches.map((match) => match.id);
  const savedPicks =
    user && matchIds.length > 0
      ? await createAdminClient()
          .from("match_predictions")
          .select("match_id,home_score,away_score,boost_applied,updated_at,created_at")
          .eq("user_id", user.id)
          .in("match_id", matchIds)
      : { data: [] };

  const picksByMatchId = new Map(
    (savedPicks.data ?? []).map((pick: any) => [
      Number(pick.match_id),
      {
        homeScore: Number(pick.home_score ?? 0),
        awayScore: Number(pick.away_score ?? 0),
        boostApplied: Boolean(pick.boost_applied),
        updatedAt: String(pick.updated_at ?? ""),
        createdAt: String(pick.created_at ?? ""),
      },
    ]),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Fixture Picks"
        title="Match center predictions."
        description="Make picks only against synced API-Football fixtures. If fixtures are missing, the app shows an admin sync state instead of invented matches."
        badge="Server kickoff locks"
      />
      {data.nextMatches.length === 0 ? (
        <EmptyStateCard
          icon={Goal}
          title="No fixtures synced yet"
          message="Ask an admin to run sync. The production app will not display invented World Cup fixtures."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.nextMatches.map((match) => (
            <PremiumMatchCard key={match.id} match={match} initialPick={picksByMatchId.get(match.id)} signedIn={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
