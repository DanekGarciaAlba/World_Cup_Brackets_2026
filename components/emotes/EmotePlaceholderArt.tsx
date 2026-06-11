"use client";

import { Brackets, Check, Crown, Medal, PartyPopper, Shield, Sparkles, Trophy, TrendingUp, VolumeX, Waves } from "lucide-react";
import type { CSSProperties } from "react";
import type { EmoteCatalogItem } from "@/lib/emotes/emoteCatalog";
import { cn } from "@/lib/utils";

export const emoteIconMap = {
  trophy: Trophy,
  slide: Waves,
  dance: Sparkles,
  crown: Crown,
  spark: PartyPopper,
  calm: Shield,
  wag: Medal,
  quiet: VolumeX,
  score: Check,
  rank: TrendingUp,
  bracket: Brackets,
  group: Medal,
} satisfies Record<EmoteCatalogItem["icon"], typeof Trophy>;

type EmotePlaceholderArtProps = {
  emote: EmoteCatalogItem;
  selected?: boolean;
  locked?: boolean;
  size?: "sm" | "card" | "hero";
  className?: string;
};

export function EmotePlaceholderArt({ emote, selected = false, locked = false, size = "card", className }: EmotePlaceholderArtProps) {
  const Icon = emoteIconMap[emote.icon];
  const style = {
    "--emote-start": emote.gradient[0],
    "--emote-end": emote.gradient[1],
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-2xl border border-white/12 bg-[#071126]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.12)]",
        size === "sm" ? "size-12 rounded-xl" : size === "hero" ? "min-h-40" : "min-h-24",
        selected && "border-primary/70",
        locked && "opacity-60 grayscale",
        className,
      )}
      style={{
        ...style,
        background:
          "radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--emote-start) 42%, transparent), transparent 48%), linear-gradient(145deg, rgba(255,255,255,.065), color-mix(in srgb, var(--emote-end) 44%, #02050d))",
      }}
    >
      <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <span className="absolute bottom-2 h-[32%] w-[58%] rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--emote-start)_34%,transparent),transparent_70%)] blur-sm" />
      {emote.thumbnailPath ? (
        <img src={emote.thumbnailPath} alt={emote.name} className="relative z-[1] h-full w-full object-contain p-1 drop-shadow-[0_14px_18px_rgba(0,0,0,.32)]" />
      ) : (
        <span className={cn("relative z-[1] grid place-items-center rounded-[1.15rem] border border-white/15 bg-[#02050d]/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.14)]", size === "sm" ? "size-9" : size === "hero" ? "size-24" : "size-14")}>
          <Icon className={cn(size === "sm" ? "size-4" : size === "hero" ? "size-11" : "size-7")} />
        </span>
      )}
    </div>
  );
}
