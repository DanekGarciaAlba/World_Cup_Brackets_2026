"use client";

import { Dumbbell, Medal, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { celebrations } from "./avatar-options";

const icons = [Medal, Sparkles, Shirt, Dumbbell];

type CelebrationSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CelebrationSelector({ value, onChange }: CelebrationSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {celebrations.map((celebration, index) => {
        const Icon = icons[index] ?? Medal;
        return (
          <Button
            type="button"
            key={celebration.value}
            variant={value === celebration.value ? "default" : "secondary"}
            className={cn("justify-start", value !== celebration.value && "bg-secondary/60")}
            onClick={() => onChange(celebration.value)}
          >
            <Icon className="size-4" />
            {celebration.label}
          </Button>
        );
      })}
    </div>
  );
}
