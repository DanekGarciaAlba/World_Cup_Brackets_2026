import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react";
import { AvatarPreview } from "@/components/avatar/AvatarPreview";
import type { LeaderboardEntry } from "@/lib/demo-data";

type LeaderboardPodiumProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const top = entries.slice(0, 3);

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {top.map((entry, index) => (
        <article key={entry.name} className={`app-panel rounded-lg p-4 ${index === 0 ? "lg:-mt-4" : ""}`}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Rank {entry.rank}</span>
            <RankMovement current={entry.rank} previous={entry.previousRank} />
          </div>
          <AvatarPreview
            className="mb-4"
            config={{ skin_tone: entry.avatarTone, kit_primary_color: entry.kit, kit_secondary_color: "#f1f7ff" }}
          />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{entry.name}</p>
              <p className="text-sm text-muted-foreground">{entry.team}</p>
            </div>
            <div className="text-right">
              <Trophy className="mb-1 ml-auto size-5 text-primary" />
              <p className="text-2xl font-semibold">{entry.points}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function RankMovement({ current, previous }: { current: number; previous: number }) {
  if (current < previous) return <span className="flex items-center gap-1 text-xs text-primary"><ArrowUp className="size-3" /> Up {previous - current}</span>;
  if (current > previous) return <span className="flex items-center gap-1 text-xs text-destructive"><ArrowDown className="size-3" /> Down {current - previous}</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="size-3" /> Hold</span>;
}
