import { Sparkles } from "lucide-react";
import type { DataQualitySummary } from "@/lib/data/worldCupValidation";

export function BoostAvailableCard({ quality }: { quality: DataQualitySummary }) {
  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Pick status</p>
        <Sparkles className="size-5 text-trophy-gold" />
      </div>
      <p className="mt-7 text-2xl font-semibold">
        {quality.missingFixtureData ? "Fixtures pending" : "Ready for picks"}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {quality.missingFixtureData
          ? "No fixtures synced yet. Ask an admin to run sync before predictions open."
          : "Fixtures are available. Prediction lock rules can be enforced server-side."}
      </p>
    </section>
  );
}
