import type { GroupSummary } from "@/lib/data/worldCupData";

export function ThirdPlaceRacePanel({ groups }: { groups: GroupSummary[] }) {
  return (
    <section className="premium-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Third-place race</p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Top 2 teams in each group advance, plus the 8 best third-place teams. This panel activates once official group data
        and standings are synced.
      </p>
      <p className="mt-5 text-3xl font-semibold">{groups.length}/12</p>
      <p className="text-sm text-muted-foreground">Groups detected</p>
    </section>
  );
}
