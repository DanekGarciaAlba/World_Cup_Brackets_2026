import { Sparkles } from "lucide-react";

export function BoostChip({ disabled }: { disabled?: boolean }) {
  return (
    <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${disabled ? "border-white/10 text-muted-foreground" : "border-trophy-gold/35 bg-trophy-gold/10 text-trophy-gold"}`}>
      <Sparkles className="size-3.5" />
      Boost
    </span>
  );
}
