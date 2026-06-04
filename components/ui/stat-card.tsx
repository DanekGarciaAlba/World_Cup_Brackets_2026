import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  badge?: string;
  tone?: "blue" | "gold" | "green" | "red";
};

const toneClass = {
  blue: "text-electric",
  gold: "text-trophy-gold",
  green: "text-pitch-green",
  red: "text-live-red",
};

export function StatCard({ label, value, detail, icon: Icon, badge, tone = "blue" }: StatCardProps) {
  return (
    <article className="premium-card min-h-[168px] p-5">
      <div className="flex items-start justify-between gap-3">
        <Icon className={cn("size-6", toneClass[tone])} />
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>
      <div className="mt-8">
        <p className="text-4xl font-semibold leading-none">{value}</p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
        {detail ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
      </div>
    </article>
  );
}
