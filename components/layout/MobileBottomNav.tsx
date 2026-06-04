"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "./nav-items";

const mobileItems = [navItems[0], navItems[1], navItems[3], navItems[4], navItems[6]];
const moreItems = [navItems[2], navItems[5], navItems[7]];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl border border-border bg-sidebar/95 p-1.5 shadow-2xl backdrop-blur-2xl md:hidden">
      {mobileItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            href={item.href}
            key={item.href}
            aria-label={item.label}
            className={cn(
              "grid min-h-14 place-items-center rounded-md text-muted-foreground transition",
              isActive && "bg-electric text-white",
            )}
          >
            <item.icon className="size-5" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="grid min-h-14 place-items-center rounded-md p-0 text-muted-foreground">
            <Menu className="size-5" />
            <span className="sr-only">More</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="border-border bg-sidebar">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="mt-5 grid gap-2">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 text-sm font-semibold"
              >
                <item.icon className="size-5 text-electric" />
                {item.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
