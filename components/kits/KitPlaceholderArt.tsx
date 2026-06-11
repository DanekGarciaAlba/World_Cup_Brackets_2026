import type { CSSProperties } from "react";
import { KitCountryFlagBadge } from "@/components/kits/KitCountryFlagBadge";
import type { KitCatalogItem } from "@/lib/kits/kitCatalog";
import { cn } from "@/lib/utils";

type KitPlaceholderArtProps = {
  kit: KitCatalogItem;
  selected?: boolean;
  compact?: boolean;
  className?: string;
};

export function KitPlaceholderArt({ kit, selected = false, compact = false, className }: KitPlaceholderArtProps) {
  const style = {
    "--kit-primary": kit.primaryColor,
    "--kit-secondary": kit.secondaryColor,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative grid min-h-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#071126]",
        selected && "border-primary/70",
        compact ? "min-h-20" : "min-h-[8.75rem]",
        className,
      )}
      style={{
        ...style,
        background:
          "radial-gradient(ellipse at 50% 82%, color-mix(in srgb, var(--kit-primary) 34%, transparent), transparent 45%), linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.014))",
      }}
    >
      <span className="absolute inset-0 bg-[url('/assets/ui/stadium-bg.webp')] bg-cover bg-center opacity-20 mix-blend-screen" />
      <KitCountryFlagBadge kit={kit} compact className="absolute right-2 top-2" />
      {kit.thumbnailPath ? (
        <img
          src={kit.thumbnailPath}
          alt={`${kit.name} kit`}
          className={cn("relative z-[1] h-full w-full object-contain object-center p-2 drop-shadow-[0_18px_18px_rgba(0,0,0,.42)]", compact ? "max-h-24" : "max-h-full")}
        />
      ) : (
        <div className={cn("relative z-[1] drop-shadow-[0_18px_18px_rgba(0,0,0,.42)]", compact ? "h-16 w-14" : "h-28 w-24")}>
          <span className="absolute left-1/2 top-0 h-[58%] w-[64%] -translate-x-1/2 rounded-t-[22%] border border-white/18 bg-[linear-gradient(135deg,var(--kit-primary),var(--kit-secondary))]" />
          <span className="absolute left-[4%] top-[12%] h-[30%] w-[28%] -rotate-[22deg] rounded-lg bg-[linear-gradient(135deg,var(--kit-primary),var(--kit-secondary))]" />
          <span className="absolute right-[4%] top-[12%] h-[30%] w-[28%] rotate-[22deg] rounded-lg bg-[linear-gradient(135deg,var(--kit-primary),var(--kit-secondary))]" />
          <span className="absolute bottom-[7%] left-[16%] h-[34%] w-[28%] rounded-md border border-white/14 bg-[linear-gradient(180deg,var(--kit-secondary),#071126)]" />
          <span className="absolute bottom-[7%] right-[16%] h-[34%] w-[28%] rounded-md border border-white/14 bg-[linear-gradient(180deg,var(--kit-secondary),#071126)]" />
        </div>
      )}
    </div>
  );
}
