"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DataQualitySummary } from "@/lib/data/worldCupValidation";

type DataQualityPanelProps = {
  initial: DataQualitySummary;
};

export function DataQualityPanel({ initial }: DataQualityPanelProps) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function runSync() {
    setBusy("sync");
    try {
      const response = await fetch("/api/admin/sync-now", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      toast.success("World Cup data synced", {
        description: payload?.imported
          ? `${payload.imported.teams} teams, ${payload.imported.fixtures} fixtures, ${payload.imported.standings} standings rows.`
          : "Provider data imported.",
      });
      await revalidate();
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Sign in as an admin and try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function revalidate() {
    setBusy("validate");
    try {
      const response = await fetch("/api/admin/data-quality", { method: "POST" });
      const payload = (await response.json()) as DataQualitySummary;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(payload);
      toast.success("World Cup data revalidated");
    } catch (error) {
      toast.error("Validation failed", {
        description: error instanceof Error ? error.message : "Check server logs.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QualityMetric label="Teams synced" value={data.counts.teams} />
        <QualityMetric label="Fixtures synced" value={data.counts.matches} />
        <QualityMetric label="Groups detected" value={data.counts.groups} />
        <QualityMetric label="Standings rows" value={data.counts.standings} />
        <QualityMetric label="Leaderboard rows" value={data.counts.leaderboardRows} />
        <QualityMetric label="Predictions" value={data.counts.predictions} />
        <QualityMetric label="Mini-leagues" value={data.counts.miniLeagues} />
        <article className="premium-card p-4">
          <p className="text-sm text-muted-foreground">Validation status</p>
          <div className="mt-3 flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <StatusBadge status={data.lastValidationStatus} />
          </div>
        </article>
      </section>

      <section className="premium-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-semibold">Data sync quality</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Last sync: {data.lastSync?.finished_at ?? data.lastSync?.started_at ?? "No sync logged yet"}
            </p>
            {data.fakeOrUnconfirmedRows > 0 ? (
              <p className="mt-2 text-sm text-trophy-gold">
                {data.fakeOrUnconfirmedRows} rows need provider payloads or admin-confirmed seed markers.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={runSync} disabled={Boolean(busy)}>
              <RefreshCw className={`size-4 ${busy === "sync" ? "animate-spin" : ""}`} />
              Run Sync
            </Button>
            <Button variant="secondary" onClick={revalidate} disabled={Boolean(busy)}>
              <RefreshCw className={`size-4 ${busy === "validate" ? "animate-spin" : ""}`} />
              Revalidate Data
            </Button>
          </div>
        </div>
      </section>

      <section className="premium-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_150px_2fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span>Area</span>
          <span>Check</span>
          <span>Status</span>
          <span>Notes</span>
        </div>
        <div className="divide-y divide-white/10">
          {data.rows.map((row) => (
            <article
              className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_150px_2fr] md:gap-3"
              key={`${row.Area}-${row.Check}`}
            >
              <span className="font-medium">{row.Area}</span>
              <span className="text-muted-foreground">{row.Check}</span>
              <StatusBadge status={row.Status} />
              <span className="leading-6 text-muted-foreground">{row.Notes}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="premium-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-4xl font-semibold">{value}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "PASS" ? "default" : status === "FAIL" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
