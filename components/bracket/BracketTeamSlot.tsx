import type { TeamSummary } from "@/lib/data/worldCupData";

export function BracketTeamSlot({ team, label }: { team: TeamSummary | null; label?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3">
      <span className="truncate text-sm font-semibold">{team?.name ?? label ?? "TBD"}</span>
      <span className="text-xs text-muted-foreground">{team?.code ?? ""}</span>
    </div>
  );
}
