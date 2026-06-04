import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { AvatarConfig, defaultAvatarConfig } from "./avatar-options";

type AvatarPreviewProps = {
  config?: Partial<AvatarConfig>;
  className?: string;
  label?: string;
};

export function AvatarPreview({ config, className, label }: AvatarPreviewProps) {
  const avatar = { ...defaultAvatarConfig, ...config };
  const style = {
    "--skin": avatar.skin_tone,
    "--hair": avatar.hair_color,
    "--kit-primary": avatar.kit_primary_color,
    "--kit-secondary": avatar.kit_secondary_color,
  } as CSSProperties;

  return (
    <div className={cn("grid justify-items-center gap-3", className)} style={style}>
      <div className="relative grid size-36 place-items-center rounded-lg border border-border bg-background/70 shadow-2xl">
        <div className="absolute inset-x-6 bottom-5 h-16 rounded-t-[36px] border border-white/15 bg-[linear-gradient(135deg,var(--kit-primary),var(--kit-secondary))]">
          <div
            className={cn(
              "absolute inset-y-0 w-9 bg-white/24",
              avatar.kit_pattern === "sash" && "left-10 -skew-x-12",
              avatar.kit_pattern === "stripe" && "left-1/2 -translate-x-1/2",
              avatar.kit_pattern === "clean" && "hidden",
            )}
          />
          <div className="absolute left-1/2 top-4 h-6 w-5 -translate-x-1/2 rounded-[4px] border border-white/70 bg-background/45" />
        </div>
        <div className="absolute top-7 h-16 w-16 rounded-full border border-white/20 bg-[var(--skin)]">
          <div className="absolute -top-1 left-2 h-6 w-12 rounded-t-full bg-[var(--hair)]" />
          <div className="absolute left-4 top-7 size-2 rounded-full bg-[#08111f]" />
          <div className="absolute right-4 top-7 size-2 rounded-full bg-[#08111f]" />
          <div className="absolute bottom-4 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-[#7a3f35]/55" />
        </div>
      </div>
      {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
    </div>
  );
}
