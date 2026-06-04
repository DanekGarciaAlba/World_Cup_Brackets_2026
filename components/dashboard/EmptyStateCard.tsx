import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyStateCardProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyStateCard({ icon: Icon, title, message, actionHref = "/admin/data-quality", actionLabel = "Open data quality" }: EmptyStateCardProps) {
  return (
    <div className="premium-card grid min-h-[210px] place-items-center p-6 text-center">
      <div>
        <Icon className="mx-auto mb-4 size-8 text-electric" />
        <p className="text-lg font-semibold">{title}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
        <Button asChild variant="secondary" className="mt-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
