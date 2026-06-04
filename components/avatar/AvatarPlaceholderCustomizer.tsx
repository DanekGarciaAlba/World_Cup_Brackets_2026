"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AvatarPlaceholder } from "@/components/avatar/AvatarPlaceholder";

const palette = ["#5b6cff", "#d8ad4c", "#8bd86f", "#7fd2ff", "#ff4d5f", "#f6f8ff"];

type AvatarPlaceholderCustomizerProps = {
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  initialNumber?: string | null;
  initials?: string | null;
};

export function AvatarPlaceholderCustomizer({
  initialPrimary = "#5b6cff",
  initialSecondary = "#d8ad4c",
  initialNumber = "26",
  initials,
}: AvatarPlaceholderCustomizerProps) {
  const [primary, setPrimary] = useState(initialPrimary ?? "#5b6cff");
  const [secondary, setSecondary] = useState(initialSecondary ?? "#d8ad4c");
  const [number, setNumber] = useState(initialNumber ?? "26");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="grid justify-items-center gap-4">
        <AvatarPlaceholder initials={initials} kitPrimary={primary} kitSecondary={secondary} kitNumber={number} size="lg" />
        <p className="text-sm text-muted-foreground">Premium placeholder avatar</p>
      </div>

      <div className="grid gap-5">
        <input type="hidden" name="kit_primary_color" value={primary} />
        <input type="hidden" name="kit_secondary_color" value={secondary} />
        <input type="hidden" name="kit_number" value={number} />
        <input type="hidden" name="avatar_base" value="placeholder" />
        <input type="hidden" name="skin_tone" value="#273353" />
        <input type="hidden" name="hair_style" value="placeholder" />
        <input type="hidden" name="hair_color" value="#111a33" />
        <input type="hidden" name="kit_pattern" value="solid" />
        <input type="hidden" name="badge_shape" value="shield" />
        <input type="hidden" name="celebration_style" value="clean" />

        <ColorPicker label="Kit primary" value={primary} onChange={setPrimary} />
        <ColorPicker label="Kit secondary" value={secondary} onChange={setSecondary} />
        <div className="grid gap-2">
          <Label htmlFor="kit-number">Kit number</Label>
          <Input
            id="kit-number"
            value={number}
            onChange={(event) => setNumber(event.target.value.replace(/\D/g, "").slice(0, 2) || "0")}
            inputMode="numeric"
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${color}`}
            onClick={() => onChange(color)}
            className="size-11 rounded-full border border-white/15"
            style={{
              background: color,
              boxShadow: value === color ? "0 0 0 4px rgba(91,108,255,.45)" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
