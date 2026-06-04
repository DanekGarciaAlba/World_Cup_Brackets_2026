import Link from "next/link";
import { TrendingUp } from "lucide-react";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

type MyRankCardProps = {
  leaderboard: LeaderboardSummary[];
};

export function MyRankCard({ leaderboard }: MyRankCardProps) {
  const top = leaderboard[0];

  return (
    <section className="premium-card min-h-[210px] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">My rank</p>
      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-semibold leading-none">{top ? `#${top.rank}` : "--"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{top ? `Leader: ${top.displayName}` : "Leaderboard pending"}</p>
        </div>
        <TrendingUp className="size-16 text-electric opacity-80" />
      </div>
      <Link href="/leaderboard" className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-foreground hover:text-electric">
        View Leaderboard
      </Link>
    </section>
  );
}
