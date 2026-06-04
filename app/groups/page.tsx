import { GroupPredictionBoard } from "@/components/groups/GroupPredictionBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { groups } from "@/lib/demo-data";

export default function GroupsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Group Stage"
        title="Rank every group table."
        description="Drag teams into final order, including the third-place race. The production save path will persist these rankings to Supabase."
        badge="12 groups ready"
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <GroupPredictionBoard key={group.group} group={group.group} teams={group.teams} />
        ))}
      </div>
    </div>
  );
}
