import { Trophy } from "lucide-react";

export function ChampionPickCard() {
  return (
    <section className="premium-card min-w-[260px] p-4">
      <div className="grid min-h-[180px] place-items-center text-center">
        <div>
          <Trophy className="mx-auto mb-4 size-12 text-trophy-gold" />
          <p className="text-lg font-semibold">Champion pick locked later</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Champion selections open once official bracket slots are available.</p>
        </div>
      </div>
    </section>
  );
}
