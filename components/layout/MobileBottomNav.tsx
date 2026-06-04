"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

const mobileItems = navItems.slice(0, 6);

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-lg border border-border bg-sidebar/92 p-1 shadow-2xl backdrop-blur-2xl md:hidden">
      {mobileItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            href={item.href}
            key={item.href}
            aria-label={item.label}
            className={cn(
              "grid min-h-14 place-items-center rounded-md text-muted-foreground transition",
              isActive && "bg-primary text-primary-foreground",
            )}
          >
            <item.icon className="size-5" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
