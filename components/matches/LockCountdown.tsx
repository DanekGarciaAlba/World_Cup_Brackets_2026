"use client";

import { useEffect, useState } from "react";

export function LockCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [label, setLabel] = useState("--");

  useEffect(() => {
    function tick() {
      const ms = new Date(kickoffAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Locked");
        return;
      }
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      setLabel(`${hours}h ${minutes % 60}m`);
    }
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [kickoffAt]);

  return <span className="text-sm font-semibold text-trophy-gold">{label}</span>;
}
