import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchSummary } from "@/lib/data/worldCupData";

type NextPickDeadlineCardProps = {
  match: MatchSummary | null;
};

export function NextPickDeadlineCard({ match }: NextPickDeadlineCardProps) {
  const kickoff = match ? new Date(match.kickoffAt) : null;
  const now = Date.now();
  const minutes = kickoff ? Math.max(0, Math.floor((kickoff.getTime() - now) / 60000)) : null;
  const hours = minutes === null ? null : Math.floor(minutes / 60);
  const mins = minutes === null ? null : minutes % 60;

  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Next pick deadline</p>
          <p className="mt-6 text-5xl font-semibold leading-none">
            {minutes === null ? "--" : `${hours}h ${mins}m`}
          </p>
        </div>
        <div className="grid size-16 place-items-center rounded-full border border-electric/30 bg-electric/10">
          <Clock3 className="size-8 text-electric" />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {kickoff ? kickoff.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No fixtures synced yet."}
      </p>
      <Button asChild className="mt-5 w-full">
        <Link href="/picks">Make Your Picks</Link>
      </Button>
    </section>
  );
}
