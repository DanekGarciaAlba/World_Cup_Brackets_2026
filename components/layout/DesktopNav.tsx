"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, CircleDot, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[264px] border-r border-sidebar-border bg-sidebar/82 px-4 py-5 backdrop-blur-2xl md:block">
      <Link href="/" className="flex min-h-0 items-center gap-3 rounded-lg px-2 py-1.5">
        <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_rgba(53,224,161,0.25)]">
          <TrophyMark />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">World Cup</p>
          <p className="text-xs text-muted-foreground">Brackets 2026</p>
        </div>
      </Link>

      <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <CircleDot className="size-3.5" />
          API-Football live
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Fixtures, livescore, teams, standings, and events only.</p>
      </div>

      <Separator className="my-5 bg-sidebar-border" />

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-muted-foreground transition",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="size-4" />
                    {item.label}
                  </span>
                  {isActive ? <ChevronRight className="size-4" /> : null}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="absolute inset-x-4 bottom-5">
        <Button asChild className="w-full justify-between">
          <Link href="/login">
            Sign in
            <LogIn className="size-4" />
          </Link>
        </Button>
        <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">Free points pool. No betting, odds, or payouts.</p>
      </div>
    </aside>
  );
}

function TrophyMark() {
  return (
    <span className="relative block size-5 rounded-b-md border-2 border-current">
      <span className="absolute -left-2 top-1 h-3 w-2 rounded-l-full border-2 border-r-0 border-current" />
      <span className="absolute -right-2 top-1 h-3 w-2 rounded-r-full border-2 border-l-0 border-current" />
      <span className="absolute left-1/2 top-full h-2 w-0.5 -translate-x-1/2 bg-current" />
    </span>
  );
}
