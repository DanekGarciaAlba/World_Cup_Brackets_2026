import { Goal } from "lucide-react";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumMatchCard } from "@/components/matches/PremiumMatchCard";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const data = await getWorldCupDashboardData();

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
            <PremiumMatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
