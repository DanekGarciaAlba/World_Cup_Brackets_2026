import type { MatchSummary } from "@/lib/data/worldCupData";
import { BracketMatch } from "./BracketMatch";

export function BracketRound({ title, matches }: { title: string; matches: MatchSummary[] }) {
  return (
    <section className="premium-card min-w-[260px] p-4">
      <p className="mb-4 text-sm font-semibold">{title}</p>
      <div className="space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground">Official fixtures pending</div>
        ) : (
          matches.map((match) => <BracketMatch key={match.id} match={match} />)
        )}
      </div>
    </section>
  );
}
