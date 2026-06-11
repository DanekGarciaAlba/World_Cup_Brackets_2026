import type { CSSProperties } from "react";
import { KitCountryFlagBadge } from "@/components/kits/KitCountryFlagBadge";
import { KitPlaceholderArt } from "@/components/kits/KitPlaceholderArt";
import type { KitCatalogItem } from "@/lib/kits/kitCatalog";
import { cn } from "@/lib/utils";

type ProfileKitCardProps = {
  kit: KitCatalogItem;
  className?: string;
};

export function ProfileKitCard({ kit, className }: ProfileKitCardProps) {
  const kitArtPath = kit.profileThumbnailPath ?? kit.thumbnailPath;
  const style = {
    "--kit-primary": kit.primaryColor,
    "--kit-secondary": kit.secondaryColor,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate aspect-square min-w-0 overflow-hidden rounded-xl border border-[#d8b157]/24 bg-[#071126]/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className,
      )}
      style={{
        ...style,
        background:
          "radial-gradient(ellipse at 50% 68%, color-mix(in srgb, var(--kit-primary) 26%, transparent), transparent 50%), linear-gradient(160deg, rgba(9,20,46,.94), rgba(3,8,20,.98))",
      }}
    >
      <span className="absolute inset-0 bg-[url('/assets/ui/stadium-bg.webp')] bg-cover bg-center opacity-24 mix-blend-screen" />
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,.055),transparent_38%,rgba(2,7,19,.58))]" />
      <div className="absolute left-3 right-3 top-3 z-[3] flex items-start justify-between gap-2">
        <p className="max-w-[6.25rem] text-[0.5rem] font-black uppercase leading-tight tracking-[0.14em] text-white/46">Supported country</p>
        <KitCountryFlagBadge kit={kit} compact />
      </div>

      <div className="absolute inset-1 z-[1] grid place-items-center">
        {kitArtPath ? (
          <img
            src={kitArtPath}
            alt={`${kit.name} kit`}
            className="drop-shadow-[0_22px_18px_rgba(0,0,0,.46)]"
            style={{
              width: "88%",
              height: "80%",
              objectFit: "contain",
              objectPosition: "center center",
              transform: "translate(6%, -5%)",
            }}
          />
        ) : (
          <KitPlaceholderArt kit={kit} selected className="h-full w-full rounded-lg border-0 bg-transparent" />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[3] min-w-0 bg-gradient-to-t from-[#020713]/62 via-[#020713]/18 to-transparent p-3 pt-7">
        <h2 className="truncate text-2xl font-black leading-none text-white drop-shadow-[0_7px_16px_rgba(0,0,0,.5)]">{kit.countryName}</h2>
        <p
          className="mt-1 truncate text-sm font-black drop-shadow-[0_0_12px_rgba(216,177,87,.32)]"
          style={{
            backgroundImage: "linear-gradient(90deg,#fff6bc,#d8b157 42%,#fff0a6 68%,#b78a35)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {kit.name} kit
        </p>
      </div>
    </div>
  );
}
