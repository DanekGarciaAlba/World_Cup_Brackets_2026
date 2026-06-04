import { CircleGauge } from "lucide-react";
import type { DataQualitySummary } from "@/lib/data/worldCupValidation";

export function BracketHealthCard({ quality }: { quality: DataQualitySummary }) {
  const fixturePct = Math.min(100, Math.round((quality.counts.matches / 104) * 100));
  const groupPct = Math.min(100, Math.round((quality.counts.groups / 12) * 100));

  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Bracket health</p>
        <CircleGauge className="size-5 text-trophy-gold" />
      </div>
      <div className="mt-6 grid grid-cols-[98px_1fr] items-center gap-5">
        <div className="grid size-24 place-items-center rounded-full border-[10px] border-trophy-gold/70 bg-[#071025]">
          <span className="text-2xl font-semibold">{fixturePct}%</span>
        </div>
        <div className="space-y-4">
          <Meter label="Fixtures" value={fixturePct} />
          <Meter label="Groups" value={groupPct} />
          <Meter label="Validation" value={quality.lastValidationStatus === "PASS" ? 100 : 35} />
        </div>
      </div>
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-pitch-green" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
