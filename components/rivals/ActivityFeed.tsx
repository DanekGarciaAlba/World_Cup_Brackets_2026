import type { ActivitySummary } from "@/lib/data/worldCupData";

export function ActivityFeed({ activity }: { activity: ActivitySummary[] }) {
  return (
    <section className="premium-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Activity feed</p>
      {activity.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-muted-foreground">No mini-league activity yet.</p>
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
