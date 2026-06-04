import { TrendingUp } from "lucide-react";

export function BiggestMoverCard() {
  return (
    <section className="premium-card p-5">
      <TrendingUp className="mb-4 size-7 text-electric" />
      <p className="text-sm text-muted-foreground">Biggest mover</p>
      <p className="mt-2 text-xl font-semibold">Pending</p>
      <p className="mt-1 text-sm text-muted-foreground">Rank movement activates after scoring snapshots.</p>
    </section>
  );
}
