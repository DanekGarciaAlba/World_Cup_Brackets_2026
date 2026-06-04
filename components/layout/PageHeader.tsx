import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, badge, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          {badge ? (
            <Badge variant="secondary" className="border border-border bg-secondary/80 text-secondary-foreground">
              {badge}
            </Badge>
          ) : null}
        </div>
        <h1 className="max-w-5xl text-balance text-[clamp(2rem,5vw,4.7rem)] font-semibold leading-[0.95] tracking-normal">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
