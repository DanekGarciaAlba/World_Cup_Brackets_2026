import type { ReactNode } from "react";
import { DesktopNav } from "./DesktopNav";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DesktopNav />
      <div className="md:pl-[264px]">
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-7 lg:px-8">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
