import { Trophy } from "lucide-react";
import { ProfilePortrait } from "@/components/profile/ProfilePortrait";
import { PublicProfileAvatar } from "@/components/profile/PublicProfileAvatar";
import type { EmoteCatalogItem } from "@/lib/emotes/emoteCatalog";
import type { KitCatalogItem } from "@/lib/kits/kitCatalog";
import type { MascotDefinition } from "@/lib/mascots/mascotCatalog";
import type { MascotSkin } from "@/lib/mascots/skinCatalog";
import { cn } from "@/lib/utils";

type FullPublicProfileCardProps = {
  displayName: string;
  mascot: MascotDefinition;
  skin: MascotSkin;
  emote: EmoteCatalogItem;
  kit: KitCatalogItem;
  stats?: {
    totalPoints: number;
    correctOutcomes: number;
  } | null;
  variant?: "compact" | "large";
  className?: string;
};

export function FullPublicProfileCard({ displayName, mascot, skin, emote, kit, stats, variant = "large", className }: FullPublicProfileCardProps) {
  const compact = variant === "compact";
  const totalPoints = stats?.totalPoints ?? 0;
  const correctOutcomes = stats?.correctOutcomes ?? 0;

  return (
    <article
      className={cn(
        "relative isolate aspect-square w-full overflow-hidden rounded-[1.35rem] border border-[#d8b157]/54 bg-[#071126] text-white",
        "shadow-[0_18px_42px_rgba(0,0,0,.42),0_0_34px_rgba(216,177,87,.08),inset_0_1px_0_rgba(255,255,255,.10)]",
        compact ? "rounded-xl border-[#d8b157]/42" : "max-w-[420px]",
        className,
      )}
    >
      {skin.thumbnailPath ? (
        <img
          src={skin.thumbnailPath}
          alt={`${skin.name} ${mascot.name} profile card`}
          className="absolute inset-0 h-full w-full scale-[1.012] object-cover"
        />
      ) : (
        <ProfilePortrait mascot={mascot} skin={skin} kit={kit} size="hero" showBadges={false} className="absolute inset-0 h-full min-h-0 w-full rounded-none border-0 shadow-none" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_47%,transparent_0%,transparent_33%,rgba(216,177,87,.18)_34%,transparent_35%),linear-gradient(180deg,rgba(2,7,19,.18),transparent_42%,rgba(2,7,19,.56))]" />
      <div className="pointer-events-none absolute inset-0 border border-white/5" />

      <div className={cn("absolute left-[7%] top-[7%] z-[2] min-w-0", compact ? "max-w-[44%]" : "max-w-[54%]")}>
        <h2 className={cn("truncate font-black leading-none text-white drop-shadow-[0_8px_18px_rgba(0,0,0,.45)]", compact ? "text-lg" : "text-5xl")}>{mascot.name}</h2>
        <p className={cn("mt-1 truncate font-black uppercase tracking-[0.16em] text-white/56", compact ? "text-[0.54rem]" : "text-xl")}>{mascot.host}</p>
      </div>

      <PublicProfileAvatar emote={emote} size={compact ? 56 : 104} className="absolute right-[4%] top-[5%] z-[3]" label={`${displayName} emote`} />

      <div
        className={cn(
          "absolute inset-x-[7%] bottom-[6%] z-[3] grid items-center gap-3 rounded-[1.15rem] border border-[#d8b157]/28 bg-[#020713]/72 shadow-[inset_0_1px_0_rgba(255,255,255,.10)] backdrop-blur",
          compact ? "grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-2 rounded-xl px-2 py-1.5" : "grid-cols-[3rem_minmax(0,1fr)_auto] px-4 py-3",
        )}
      >
        <span className={cn("grid place-items-center rounded-full border border-[#d8b157]/45 bg-[#d8b157]/10 text-[#f0d38b]", compact ? "size-7" : "size-12")}>
          <Trophy className={cn(compact ? "size-4" : "size-6")} />
        </span>
        <span className={cn("grid min-w-0 grid-cols-2", compact ? "gap-1" : "gap-2")}>
          <span className="min-w-0">
            <span className={cn("block truncate font-black uppercase tracking-[0.14em] text-[#d8b157]", compact ? "text-[0.44rem]" : "text-xs")}>Pts</span>
            <span className={cn("block truncate font-black leading-none text-white", compact ? "text-[0.72rem]" : "text-lg")}>{totalPoints}</span>
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate font-black uppercase tracking-[0.14em] text-[#d8b157]", compact ? "text-[0.44rem]" : "text-xs")}>{compact ? "Cor" : "Correct"}</span>
            <span className={cn("block truncate font-black leading-none text-white", compact ? "text-[0.72rem]" : "text-lg")}>{correctOutcomes}</span>
          </span>
        </span>
        <span className={cn("inline-flex max-w-[7.5rem] items-center gap-1.5 truncate rounded-full border border-white/16 bg-white/[0.055] font-black text-white", compact ? "px-2 py-1 text-[0.58rem]" : "px-3 py-2 text-base")}>
          <span className="text-[#d8b157]">{kit.flagLabel}</span>
          {compact ? null : <span className="truncate">{kit.countryName}</span>}
        </span>
      </div>
    </article>
  );
}
