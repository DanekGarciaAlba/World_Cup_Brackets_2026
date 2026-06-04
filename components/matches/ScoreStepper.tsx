"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScoreStepper({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-[44px_64px_44px] items-center rounded-2xl border border-white/10 bg-[#071025] p-1">
      <Button type="button" size="icon" variant="ghost" disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus className="size-4" />
      </Button>
      <div className="text-center text-3xl font-semibold">{value}</div>
      <Button type="button" size="icon" variant="ghost" disabled={disabled || value >= 12} onClick={() => onChange(Math.min(12, value + 1))}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
