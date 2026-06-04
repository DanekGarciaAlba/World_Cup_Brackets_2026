import { Sparkles } from "lucide-react";

type BoostChipProps = {
  disabled?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

export function BoostChip({ disabled, selected, onToggle }: BoostChipProps) {
  const className = `inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
    disabled
      ? "border-white/10 text-muted-foreground"
      : selected
        ? "border-trophy-gold bg-trophy-gold/20 text-trophy-gold shadow-[0_0_22px_rgba(216,173,76,.2)]"
        : "border-trophy-gold/35 bg-trophy-gold/10 text-trophy-gold hover:border-trophy-gold"
  }`;

  if (onToggle) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={onToggle} aria-pressed={selected}>
        <Sparkles className="size-3.5" />
        {selected ? "Boost on" : "Boost"}
      </button>
    );
  }

  return (
    <span className={className}>
      <Sparkles className="size-3.5" />
      {selected ? "Boost on" : "Boost"}
    </span>
  );
}
