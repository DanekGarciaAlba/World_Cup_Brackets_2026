import { AvatarSlot } from "@/components/avatar/AvatarSlot";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

export function MobileLeaderboardCards({ entries }: { entries: LeaderboardSummary[] }) {
  return (
    <div className="grid gap-3 md:hidden">
      {entries.map((entry) => (
        <article key={entry.userId} className="premium-card p-4">
          <div className="flex items-center justify-between gap-3">
            <AvatarSlot
              initials={entry.avatar?.initials}
              label={`#${entry.rank} ${entry.displayName}`}
              sublabel={entry.department ?? "Player"}
              kitPrimary={entry.avatar?.kitPrimary}
              kitSecondary={entry.avatar?.kitSecondary}
              kitNumber={entry.avatar?.kitNumber}
            />
            <p className="text-2xl font-semibold text-trophy-gold">{entry.totalPoints}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
