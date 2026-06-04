import { Badge } from "@/components/ui/badge";
import type { ValidationRow } from "@/lib/data/worldCupValidation";

export function ValidationResultTable({ rows }: { rows: ValidationRow[] }) {
  return (
    <section className="premium-card overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_150px_2fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span>Area</span>
        <span>Check</span>
        <span>Status</span>
        <span>Notes</span>
      </div>
      {rows.map((row) => (
        <div key={`${row.Area}-${row.Check}`} className="grid gap-2 border-b border-white/10 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_150px_2fr] md:gap-3">
          <span>{row.Area}</span>
          <span className="text-muted-foreground">{row.Check}</span>
          <Badge variant={row.Status === "PASS" ? "default" : row.Status === "FAIL" ? "destructive" : "secondary"}>{row.Status}</Badge>
          <span className="text-muted-foreground">{row.Notes}</span>
        </div>
      ))}
    </section>
  );
}
