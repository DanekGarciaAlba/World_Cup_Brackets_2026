import { AvatarSlot } from "@/components/avatar/AvatarSlot";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

export function PremiumLeaderboardTable({ entries }: { entries: LeaderboardSummary[] }) {
  if (entries.length === 0) {
    return (
      <section className="premium-card grid min-h-[260px] place-items-center p-8 text-center">
        <div>
          <p className="text-xl font-semibold">Leaderboard pending</p>
          <p className="mt-2 text-sm text-muted-foreground">No leaderboard rows exist yet. Scores appear after predictions are calculated.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-card overflow-hidden">
      <div className="hidden grid-cols-[90px_1fr_120px_120px_120px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground md:grid">
        <span>Rank</span>
        <span>Player</span>
        <span>Matches</span>
        <span>Bracket</span>
        <span>Total</span>
      </div>
      <div className="divide-y divide-white/10">
        {entries.map((entry) => (
          <article key={entry.userId} className="grid gap-3 px-5 py-4 md:grid-cols-[90px_1fr_120px_120px_120px] md:items-center">
            <span className="text-lg font-semibold">#{entry.rank}</span>
            <AvatarSlot
              initials={entry.avatar?.initials}
              label={entry.displayName}
              sublabel={entry.department ?? "Player"}
              kitPrimary={entry.avatar?.kitPrimary}
              kitSecondary={entry.avatar?.kitSecondary}
              kitNumber={entry.avatar?.kitNumber}
            />
            <span className="text-sm text-muted-foreground">{entry.matchPoints}</span>
            <span className="text-sm text-muted-foreground">{entry.bracketPoints}</span>
            <span className="text-xl font-semibold text-trophy-gold">{entry.totalPoints}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
