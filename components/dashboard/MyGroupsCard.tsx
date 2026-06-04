import Link from "next/link";
import { Users } from "lucide-react";
import type { GroupSummary } from "@/lib/data/worldCupData";

export function MyGroupsCard({ groups }: { groups: GroupSummary[] }) {
  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Groups</p>
        <Users className="size-5 text-electric" />
      </div>
      {groups.length === 0 ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">Group data pending sync. The app will not invent group tables.</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {groups.slice(0, 12).map((group) => (
            <div key={group.groupName} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <p className="font-semibold">Group {group.groupName}</p>
              <p className="text-xs text-muted-foreground">{group.teams.length} teams</p>
            </div>
          ))}
        </div>
      )}
      <Link href="/groups" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold hover:text-electric">
        Open Groups
      </Link>
    </section>
  );
}
