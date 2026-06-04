import Link from "next/link";
import { Trophy } from "lucide-react";
import { AvatarSlot } from "@/components/avatar/AvatarSlot";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

type LeaderboardPodiumCardProps = {
  entries: LeaderboardSummary[];
};

export function LeaderboardPodiumCard({ entries }: LeaderboardPodiumCardProps) {
  return (
    <section className="premium-card min-h-[282px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Leaderboard top 3</p>
        <Trophy className="size-5 text-trophy-gold" />
      </div>
      {entries.length === 0 ? (
        <div className="grid min-h-[190px] place-items-center text-center">
          <div>
            <p className="font-semibold">Leaderboard pending</p>
            <p className="mt-2 text-sm text-muted-foreground">Scores will appear after predictions are calculated.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {entries.slice(0, 3).map((entry) => (
            <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <AvatarSlot
                initials={entry.avatar?.initials}
                label={entry.displayName}
                sublabel={entry.department ?? `Rank ${entry.rank}`}
                kitPrimary={entry.avatar?.kitPrimary}
                kitSecondary={entry.avatar?.kitSecondary}
                kitNumber={entry.avatar?.kitNumber}
              />
              <p className="font-semibold text-trophy-gold">{entry.totalPoints}</p>
            </div>
          ))}
        </div>
      )}
      <Link href="/leaderboard" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold hover:text-electric">
        View Full Leaderboard
      </Link>
    </section>
  );
}
