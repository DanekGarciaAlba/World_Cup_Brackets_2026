import { getSystemStatus } from "@/lib/system/status";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getWorldCupDataQuality } from "@/lib/data/worldCupValidation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminSystemCheckPage() {
  const [status, quality] = await Promise.all([getSystemStatus(), getWorldCupDataQuality(createAdminClient())]);

  return (
    <div>
      <PageHeader
        eyebrow="System Check"
        title="Backend readiness snapshot."
        description="These checks confirm the pieces we connected: API-Football, Supabase, Vercel link, and protected cron."
      />
      <section className="premium-card mb-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">World Cup data validation</p>
            <p className="text-sm text-muted-foreground">Surface data-quality issues instead of hiding them with invented UI data.</p>
          </div>
          <Badge variant={quality.lastValidationStatus === "PASS" ? "default" : quality.lastValidationStatus === "FAIL" ? "destructive" : "secondary"}>
            {quality.lastValidationStatus}
          </Badge>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
