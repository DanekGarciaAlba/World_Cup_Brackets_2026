"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[292px] border-r border-sidebar-border bg-[#050a18]/95 px-5 py-6 shadow-[20px_0_80px_rgba(0,0,0,.36)] backdrop-blur-2xl md:flex md:flex-col">
      <Link href="/" className="flex min-h-0 items-center gap-4">
        <div className="grid size-16 place-items-center rounded-2xl border border-trophy-gold/30 bg-[radial-gradient(circle_at_50%_10%,rgba(216,173,76,.38),rgba(91,108,255,.18)_48%,rgba(9,16,37,.95))] text-trophy-gold shadow-[0_0_34px_rgba(216,173,76,.22)]">
          <Trophy className="size-8" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight">World Cup</p>
          <p className="text-sm text-muted-foreground">Brackets 2026</p>
        </div>
      </Link>

      <div className="mt-8 rounded-2xl border border-pitch-green/25 bg-pitch-green/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-pitch-green">
          <span className="size-2.5 rounded-full bg-pitch-green shadow-[0_0_18px_rgba(139,216,111,.8)]" />
          API-Football live
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Fixtures, livescore, teams, standings, and events only.</p>
      </div>

      <nav className="mt-9 space-y-1.5">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              href={item.href}
              key={item.href}
              className={cn(
                "group flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition",
                "hover:bg-sidebar-accent hover:text-foreground",
                active && "bg-electric text-white shadow-[0_0_0_1px_rgba(255,255,255,.14),0_14px_34px_rgba(91,108,255,.32)] hover:bg-electric hover:text-white",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button asChild className="w-full justify-between">
          <Link href="/login">
            Sign in
            <LogIn className="size-4" />
          </Link>
        </Button>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Free points pool. No betting, odds, or payouts.</p>
      </div>
    </aside>
  );
}
