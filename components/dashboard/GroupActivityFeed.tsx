import { Activity } from "lucide-react";
import type { ActivitySummary } from "@/lib/data/worldCupData";

export function GroupActivityFeed({ activity }: { activity: ActivitySummary[] }) {
  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Group activity</p>
        <Activity className="size-5 text-pitch-green" />
      </div>
      {activity.length === 0 ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">Mini-league activity will appear here after people join and make picks.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {activity.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm">{item.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
