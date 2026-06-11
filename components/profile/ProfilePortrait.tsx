import type { CSSProperties } from "react";
import { KitCountryFlagBadge } from "@/components/kits/KitCountryFlagBadge";
import type { KitCatalogItem } from "@/lib/kits/kitCatalog";
import type { MascotDefinition } from "@/lib/mascots/mascotCatalog";
import type { MascotSkin } from "@/lib/mascots/skinCatalog";
import { cn } from "@/lib/utils";

type ProfilePortraitProps = {
  mascot: MascotDefinition;
  skin: MascotSkin;
  kit?: KitCatalogItem | null;
  size?: "sm" | "md" | "lg" | "hero";
  showBadges?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "size-14",
  md: "h-28 w-full",
  lg: "h-36 w-full",
  hero: "h-full min-h-[20rem] w-full",
};

export function ProfilePortrait({ mascot, skin, kit, size = "md", showBadges = true, className }: ProfilePortraitProps) {
  const style = {
    "--mascot-accent": mascot.accent,
    "--mascot-secondary": mascot.secondaryAccent,
    "--skin-start": skin.gradient[0],
    "--skin-end": skin.gradient[1],
    "--skin-accent": skin.accent,
  } as CSSProperties;

  const compact = size === "sm";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg border border-white/12 bg-[#071126]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_18px_44px_rgba(0,0,0,.28)]",
        sizeClasses[size],
        className,
      )}
      style={{
        ...style,
        background:
          "radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--skin-accent) 28%, transparent), transparent 36%), radial-gradient(ellipse at 50% 90%, color-mix(in srgb, var(--mascot-accent) 32%, transparent), transparent 42%), linear-gradient(145deg, color-mix(in srgb, var(--skin-start) 30%, #071126), color-mix(in srgb, var(--skin-end) 50%, #020713))",
      }}
    >
      <span className="absolute inset-0 bg-[url('/assets/ui/stadium-bg.webp')] bg-cover bg-center opacity-24 mix-blend-screen" />
      <span className="absolute inset-x-0 top-0 h-1/2 bg-[conic-gradient(from_120deg_at_50%_0%,transparent,rgba(141,178,255,.22),transparent_34%,rgba(216,177,87,.18),transparent_58%)] blur-[12px]" />
      <span className="absolute left-1/2 top-[20%] h-[34%] w-[74%] -translate-x-1/2 rounded-full border border-white/10 bg-[radial-gradient(ellipse,rgba(255,255,255,.12),transparent_62%)]" />
      <span className="absolute bottom-[10%] left-1/2 h-[16%] w-[64%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--mascot-accent)_38%,transparent),rgba(102,132,255,.08)_58%,transparent_72%)] blur-sm" />

      {showBadges && kit ? <KitCountryFlagBadge kit={kit} compact className={cn("absolute right-2 top-2 z-[3]", compact && "right-1 top-1 px-1.5 text-[0.52rem]")} /> : null}

      <span
        className={cn(
          "absolute left-1/2 top-[49%] z-[2] -translate-x-1/2 -translate-y-1/2",
          compact ? "h-[70%] w-[62%]" : size === "hero" ? "h-[70%] w-[54%] max-w-[17rem]" : "h-[72%] w-[58%]",
        )}
      >
        <span className="absolute inset-x-[18%] top-0 h-[37%] rounded-[999px_999px_28px_28px] border border-white/18 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,.28),rgba(255,255,255,.07)_62%,rgba(2,5,13,.22))]" />
        <span className="absolute inset-x-[7%] bottom-[8%] h-[52%] rounded-[30px_30px_18px_18px] border border-white/16 bg-[linear-gradient(180deg,var(--skin-accent),var(--skin-start)_52%,var(--skin-end))] shadow-[inset_0_2px_0_rgba(255,255,255,.20),0_22px_28px_rgba(0,0,0,.32)]" />
        <span className="absolute left-1/2 top-[54%] grid h-[20%] min-h-6 w-[30%] min-w-8 -translate-x-1/2 place-items-center rounded-lg bg-white/92 text-sm font-black leading-none text-[#172554] shadow-[0_12px_20px_rgba(0,0,0,.22)]">
          10
        </span>
      </span>

      {showBadges ? <span className={cn("absolute left-2 top-2 z-[3] rounded-full border border-white/14 bg-[#020713]/70 px-2 py-1 font-black tracking-[0.11em] text-white/76", compact ? "hidden" : "text-[0.56rem]")}>{mascot.code}</span> : null}
    </div>
  );
}
