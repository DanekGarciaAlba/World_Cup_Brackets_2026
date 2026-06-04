import { Crown } from "lucide-react";
import type { LeaderboardSummary } from "@/lib/data/worldCupData";

export function ExactScoreKingCard({ entries }: { entries: LeaderboardSummary[] }) {
  const leader = [...entries].sort((a, b) => b.exactScores - a.exactScores)[0];
  return (
    <section className="premium-card p-5">
      <Crown className="mb-4 size-7 text-trophy-gold" />
      <p className="text-sm text-muted-foreground">Exact score leader</p>
      <p className="mt-2 text-xl font-semibold">{leader?.displayName ?? "Pending"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{leader ? `${leader.exactScores} exact scores` : "No scores yet"}</p>
    </section>
  );
}
