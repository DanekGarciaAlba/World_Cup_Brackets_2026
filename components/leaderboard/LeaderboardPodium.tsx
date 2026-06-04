import { Trophy } from "lucide-react";
import { AvatarPlaceholder } from "@/components/avatar/AvatarPlaceholder";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

type LeaderboardPodiumProps = {
  entries: LeaderboardSummary[];
};

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const top = entries.slice(0, 3);

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {top.map((entry, index) => (
        <article key={entry.userId} className={`premium-card p-5 ${index === 0 ? "lg:-mt-4" : ""}`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Rank {entry.rank}</span>
            <Trophy className="size-5 text-trophy-gold" />
          </div>
          <div className="mb-5 grid justify-items-center">
            <AvatarPlaceholder
              initials={entry.avatar?.initials}
              kitPrimary={entry.avatar?.kitPrimary}
              kitSecondary={entry.avatar?.kitSecondary}
              kitNumber={entry.avatar?.kitNumber}
              size="lg"
            />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{entry.displayName}</p>
              <p className="text-sm text-muted-foreground">{entry.department ?? "Player"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-trophy-gold">{entry.totalPoints}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
