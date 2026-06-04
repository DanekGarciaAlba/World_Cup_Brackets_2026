import { Activity } from "lucide-react";
import type { MatchSummary } from "@/lib/data/worldCupData";
import { EmptyStateCard } from "./EmptyStateCard";

type LiveMatchCardProps = {
  match: MatchSummary | null;
};

export function LiveMatchCard({ match }: LiveMatchCardProps) {
  if (!match) {
    return (
      <EmptyStateCard
        icon={Activity}
        title="No live match"
        message="No live World Cup fixture is synced right now. Livescore will appear here once provider data is available."
      />
    );
  }

  return (
    <section className="premium-card min-h-[282px] p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-live-red px-2 py-1 text-xs font-bold text-white">LIVE</span>
        <p className="text-sm text-muted-foreground">{match.groupName ?? match.stage ?? match.round ?? "Match"}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{match.venueName ?? "Venue pending"}</p>
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamCircle name={match.homeTeam?.name ?? "TBD"} code={match.homeTeam?.code} />
        <div className="text-center text-5xl font-semibold">
          {match.homeScore ?? 0} - {match.awayScore ?? 0}
        </div>
        <TeamCircle name={match.awayTeam?.name ?? "TBD"} code={match.awayTeam?.code} />
      </div>
    </section>
  );
}

function TeamCircle({ name, code }: { name: string; code?: string | null }) {
  return (
    <div className="grid justify-items-center gap-3">
      <div className="grid size-20 place-items-center rounded-full border border-trophy-gold/35 bg-[#0d1834] text-sm font-bold">
        {code ?? name.slice(0, 3).toUpperCase()}
      </div>
      <p className="max-w-28 truncate text-sm font-semibold">{name}</p>
    </div>
  );
}
