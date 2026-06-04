"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminActionPanel() {
  const [busy, setBusy] = useState<string | null>(null);

  async function runAction(label: string, url: string) {
    setBusy(label);
    try {
      const response = await fetch(url, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      toast.success(`${label} completed`);
    } catch (error) {
      toast.error(`${label} failed`, {
        description: error instanceof Error ? error.message : "Check admin login and server logs.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="app-panel rounded-lg p-4">
      <div className="mb-4">
        <p className="text-lg font-semibold">Admin actions</p>
        <p className="text-sm text-muted-foreground">Requires an authenticated admin account.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button disabled={Boolean(busy)} onClick={() => runAction("Provider sync", "/api/admin/sync-now")}>
          <RefreshCw className={`size-4 ${busy === "Provider sync" ? "animate-spin" : ""}`} />
          Sync now
        </Button>
        <Button
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => runAction("Leaderboard recalculation", "/api/admin/recalculate-leaderboard")}
        >
          <RotateCcw className={`size-4 ${busy === "Leaderboard recalculation" ? "animate-spin" : ""}`} />
          Recalculate
        </Button>
      </div>
    </section>
  );
}
