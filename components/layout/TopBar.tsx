import { Bell, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TopBarProps = {
  title?: string;
  subtitle?: string;
};

export function TopBar({ title = "Dashboard", subtitle = "Your tournament hub. Make picks, earn points, beat your rivals." }: TopBarProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="secondary" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-electric text-[10px] font-semibold text-white">
            2
          </span>
        </Button>
        <Badge variant="secondary" className="min-h-11 gap-2 px-3">
          <Globe2 className="size-4" />
          World Cup 2026
        </Badge>
      </div>
    </div>
  );
}
