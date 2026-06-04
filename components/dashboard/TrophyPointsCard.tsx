import { Trophy } from "lucide-react";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

type TrophyPointsCardProps = {
  leaderboard: LeaderboardSummary[];
};

export function TrophyPointsCard({ leaderboard }: TrophyPointsCardProps) {
  const top = leaderboard[0];

  return (
    <section className="premium-card min-h-[210px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Total points</p>
          <p className="mt-7 text-5xl font-semibold leading-none">{top?.totalPoints ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">{top ? "Current top score" : "Scoring begins after predictions"}</p>
        </div>
        <div className="grid size-28 place-items-center rounded-full bg-[radial-gradient(circle,rgba(216,173,76,.34),transparent_68%)]">
          <Trophy className="size-20 text-trophy-gold drop-shadow-[0_0_22px_rgba(216,173,76,.45)]" />
        </div>
      </div>
    </section>
  );
}
