import type { MatchSummary } from "@/lib/data/worldCupData";
import { BracketTeamSlot } from "./BracketTeamSlot";

export function BracketMatch({ match }: { match: MatchSummary }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#071025]/70 p-3">
      <BracketTeamSlot team={match.homeTeam} />
      <div className="my-2 h-px bg-white/10" />
      <BracketTeamSlot team={match.awayTeam} />
    </article>
  );
}
