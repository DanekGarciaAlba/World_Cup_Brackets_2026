import { Database, Goal, Trophy, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { DataQualitySummary } from "@/lib/data/worldCupValidation";

export function SyncStatusCards({ quality }: { quality: DataQualitySummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Teams" value={quality.counts.teams} badge="Synced" />
      <StatCard icon={Goal} label="Fixtures" value={quality.counts.matches} badge="Target 104" tone="gold" />
      <StatCard icon={Database} label="Groups" value={quality.counts.groups} badge="Target 12" tone="green" />
      <StatCard icon={Trophy} label="Leaderboard rows" value={quality.counts.leaderboardRows} badge="Cache" tone="gold" />
    </div>
  );
}
