import { Activity } from "lucide-react";
import { activity } from "@/lib/demo-data";

export function ActivityFeed() {
  return (
    <section className="app-panel rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">League pulse</p>
          <p className="text-xs text-muted-foreground">Recent pool movement</p>
        </div>
        <Activity className="size-5 text-primary" />
      </div>
      <div className="space-y-3">
        {activity.map((item) => (
          <article key={`${item.name}-${item.time}`} className="rounded-lg border border-border bg-background/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.name}</p>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.action}: <span className="text-foreground">{item.detail}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
