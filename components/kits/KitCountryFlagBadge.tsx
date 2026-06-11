import type { KitCatalogItem } from "@/lib/kits/kitCatalog";
import { cn } from "@/lib/utils";

type KitCountryFlagBadgeProps = {
  kit?: KitCatalogItem | null;
  className?: string;
  compact?: boolean;
};

export function KitCountryFlagBadge({ kit, className, compact = false }: KitCountryFlagBadgeProps) {
  const label = kit?.flagLabel ?? "--";

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center rounded-full border border-white/18 bg-[#02050d]/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur",
        compact ? "px-2 text-[0.6rem] font-black" : "px-2.5 text-[0.68rem] font-black tracking-[0.08em]",
        className,
      )}
      aria-label={kit ? `${kit.countryName} kit badge` : "No kit badge selected"}
    >
      {label}
    </span>
  );
}
