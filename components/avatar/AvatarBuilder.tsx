"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarPreview } from "./AvatarPreview";
import { AvatarConfig, defaultAvatarConfig, hairColors, skinTones } from "./avatar-options";
import { CelebrationSelector } from "./CelebrationSelector";
import { KitSelector } from "./KitSelector";

type AvatarBuilderProps = {
  initialConfig?: Partial<AvatarConfig>;
};

export function AvatarBuilder({ initialConfig }: AvatarBuilderProps) {
  const [config, setConfig] = useState<AvatarConfig>({ ...defaultAvatarConfig, ...initialConfig });

  function update(next: Partial<AvatarConfig>) {
    setConfig((current) => ({ ...current, ...next }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <AvatarPreview config={config} label="Matchday avatar" />

      <div className="grid gap-6">
        {Object.entries(config).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        <div className="grid gap-3">
          <Label>Skin tone</Label>
          <div className="flex flex-wrap gap-2">
            {skinTones.map((tone) => (
              <button
                key={tone}
                type="button"
                aria-label={`Select skin tone ${tone}`}
                onClick={() => update({ skin_tone: tone })}
                className="size-11 rounded-lg border border-border ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background: tone,
                  boxShadow: config.skin_tone === tone ? "0 0 0 3px rgba(53,224,161,.6)" : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Hair color</Label>
          <div className="flex flex-wrap gap-2">
            {hairColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Select hair color ${color}`}
                onClick={() => update({ hair_color: color })}
                className="size-11 rounded-lg border border-border ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background: color,
                  boxShadow: config.hair_color === color ? "0 0 0 3px rgba(53,224,161,.6)" : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Kit palette</Label>
          <KitSelector
            primary={config.kit_primary_color}
            secondary={config.kit_secondary_color}
            onChange={(primary, secondary) => update({ kit_primary_color: primary, kit_secondary_color: secondary })}
          />
        </div>

        <div className="grid gap-3">
          <Label>Kit pattern</Label>
          <Select value={config.kit_pattern} onValueChange={(kit_pattern) => update({ kit_pattern })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a pattern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sash">Sash</SelectItem>
              <SelectItem value="stripe">Center stripe</SelectItem>
              <SelectItem value="clean">Clean</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          <Label>Celebration</Label>
          <CelebrationSelector value={config.celebration_style} onChange={(celebration_style) => update({ celebration_style })} />
        </div>
      </div>
    </div>
  );
}
