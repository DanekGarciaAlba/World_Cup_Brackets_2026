import { DataQualityNotice } from "@/components/groups/DataQualityNotice";
import { GroupPredictionSummary } from "@/components/groups/GroupPredictionSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumGroupCard } from "@/components/groups/PremiumGroupCard";
import { ThirdPlaceRacePanel } from "@/components/groups/ThirdPlaceRacePanel";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const data = await getWorldCupDashboardData();

  return (
    <div>
      <PageHeader
        eyebrow="Group Stage"
        title="Rank official synced groups."
        description="Groups render only from real synced team data. If the final draw is not available yet, this page shows validation warnings."
        badge={`${data.groups.length}/12 groups`}
      />
      {data.groups.length === 0 ? (
        <DataQualityNotice title="Group data pending sync" message="No synced group labels were found. Run Admin Sync or add an official admin-confirmed seed before opening group predictions." />
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <ThirdPlaceRacePanel groups={data.groups} />
            <GroupPredictionSummary />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.groups.map((group) => (
              <PremiumGroupCard key={group.groupName} group={group} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
