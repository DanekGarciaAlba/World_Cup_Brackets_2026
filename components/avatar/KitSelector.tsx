"use client";

import { cn } from "@/lib/utils";
import { kitPalettes } from "./avatar-options";

type KitSelectorProps = {
  primary: string;
  secondary: string;
  onChange: (primary: string, secondary: string) => void;
};

export function KitSelector({ primary, secondary, onChange }: KitSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {kitPalettes.map((kit) => {
        const selected = kit.primary === primary && kit.secondary === secondary;
        return (
          <button
            type="button"
            key={kit.name}
            onClick={() => onChange(kit.primary, kit.secondary)}
            className={cn(
              "rounded-lg border border-border bg-background/60 p-3 text-left transition hover:border-primary/60",
              selected && "border-primary bg-primary/10",
            )}
          >
            <span className="mb-3 flex h-8 overflow-hidden rounded-md border border-white/10">
              <span className="flex-1" style={{ background: kit.primary }} />
              <span className="flex-1" style={{ background: kit.secondary }} />
            </span>
            <span className="text-xs font-medium">{kit.name}</span>
          </button>
        );
      })}
    </div>
  );
}
