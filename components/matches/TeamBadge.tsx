import type { TeamSummary } from "@/lib/data/worldCupData";

export function TeamBadge({ team, align = "left" }: { team: TeamSummary | null; align?: "left" | "right" }) {
  const code = team?.code ?? team?.name.slice(0, 3).toUpperCase() ?? "TBD";

  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-trophy-gold/25 bg-[#111d3d] text-sm font-bold text-white">
        {team?.logoUrl ? <img src={team.logoUrl} alt="" className="size-10 object-contain" /> : code}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{team?.name ?? "Team pending"}</p>
        <p className="text-xs text-muted-foreground">{team?.country ?? "Official slot pending"}</p>
      </div>
    </div>
  );
}
