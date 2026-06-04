import { Swords } from "lucide-react";

export function RivalCard() {
  return (
    <section className="premium-card grid min-h-[220px] place-items-center p-6 text-center">
      <div>
        <Swords className="mx-auto mb-4 size-8 text-electric" />
        <p className="text-lg font-semibold">Rivals unlock with mini-leagues</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Create or join a mini-league to compare points and send predefined celebration emotes.</p>
      </div>
    </section>
  );
}
