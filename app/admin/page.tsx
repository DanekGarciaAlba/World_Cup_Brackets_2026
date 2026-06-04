import Link from "next/link";
import { AdminActionPanel } from "@/components/admin/AdminActionPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSystemStatus } from "@/lib/system/status";

export default async function AdminPage() {
  const status = await getSystemStatus();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Keep the tournament data healthy."
        description="Run syncs, recalculate the leaderboard, and inspect the live backend readiness checks without exposing any secrets."
        badge="Protected actions"
        action={
          <Button asChild variant="secondary">
            <Link href="/admin/system-check">System check</Link>
          </Button>
        }
      />
      <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <AdminActionPanel />
        <div className="grid gap-3 md:grid-cols-2">
          {status.map((item) => (
            <article className="app-panel rounded-lg p-4" key={`${item.service}-${item.check}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{item.check}</p>
                <Badge variant={item.status === "PASS" ? "default" : item.status === "FAIL" ? "destructive" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.service}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.notes}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
