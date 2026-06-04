import { Users } from "lucide-react";

export function MiniLeagueCard({ count }: { count: number }) {
  return (
    <section className="premium-card p-5">
      <Users className="mb-4 size-7 text-electric" />
      <p className="text-sm text-muted-foreground">Mini-leagues</p>
      <p className="mt-2 text-3xl font-semibold">{count}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Create or join a league to unlock private rival tables.</p>
    </section>
  );
}
