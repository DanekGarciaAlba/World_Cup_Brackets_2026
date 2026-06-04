import type { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DesktopSidebar />
      <div className="md:pl-[292px]">
        <main className="mx-auto w-full max-w-[1680px] px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-8 lg:px-10">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
