import { cn } from "@/lib/utils";

type AvatarPlaceholderProps = {
  initials?: string | null;
  kitPrimary?: string | null;
  kitSecondary?: string | null;
  kitNumber?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "size-14",
  md: "size-24",
  lg: "size-40",
};

export function AvatarPlaceholder({
  initials,
  kitPrimary = "#5b6cff",
  kitSecondary = "#d8ad4c",
  kitNumber = "26",
  size = "md",
  className,
}: AvatarPlaceholderProps) {
  const letters = initials?.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-full border border-trophy-gold/35 bg-[#071025] shadow-[0_0_45px_rgba(91,108,255,.25)]",
        sizes[size],
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.2),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(91,108,255,.22),transparent_45%)]" />
      <div
        className="absolute bottom-[15%] h-[46%] w-[62%] rounded-t-[45%] border border-white/15"
        style={{ background: `linear-gradient(135deg, ${kitPrimary ?? "#5b6cff"}, ${kitSecondary ?? "#d8ad4c"})` }}
      >
        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 text-[10px] font-bold text-white/85 sm:text-xs">
          {kitNumber}
        </div>
      </div>
      <div className="absolute top-[20%] size-[34%] rounded-full border border-white/20 bg-[linear-gradient(180deg,#273353,#111a33)]" />
      {letters ? (
        <div className="relative z-10 mt-[10%] text-sm font-semibold tracking-wide text-white/90">{letters}</div>
      ) : null}
    </div>
  );
}
