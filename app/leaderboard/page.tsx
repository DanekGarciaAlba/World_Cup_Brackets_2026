import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { leaderboard } from "@/lib/demo-data";

export default function LeaderboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Leaderboard"
        title="Watch the table swing."
        description="Podium, chart, desktop table, and mobile cards are ready for the scoring cache produced by the backend."
        badge="Cache backed"
      />
      <div className="grid gap-5">
        <LeaderboardPodium entries={leaderboard} />
        <LeaderboardTable entries={leaderboard} />
      </div>
    </div>
  );
}
