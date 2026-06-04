import { cn } from "@/lib/utils";

export function MatchStatusPill({ status }: { status: string }) {
  const live = status === "live" || status === "halftime";
  return (
    <span
      className={cn(
        "inline-flex min-h-0 items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide",
        live ? "bg-live-red text-white shadow-[0_0_18px_rgba(255,77,95,.4)]" : "bg-electric/15 text-electric",
      )}
    >
      {status}
    </span>
  );
}
