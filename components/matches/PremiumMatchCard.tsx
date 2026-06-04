"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MatchSummary } from "@/lib/data/worldCupData";
import { BoostChip } from "./BoostChip";
import { LockCountdown } from "./LockCountdown";
import { MatchStatusPill } from "./MatchStatusPill";
import { PickReveal } from "./PickReveal";
import { ScoreStepper } from "./ScoreStepper";
import { TeamBadge } from "./TeamBadge";

export function PremiumMatchCard({ match }: { match: MatchSummary }) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const locked = new Date(match.kickoffAt).getTime() <= Date.now();
  const canPick = Boolean(match.homeTeam && match.awayTeam && !locked);
  const points = useMemo(() => (home === away ? 2 : 3) + (home + away > 3 ? 1 : 0), [away, home]);

  function savePick() {
    if (!canPick) return;
    window.localStorage.setItem(`wcb26:pick:${match.id}`, JSON.stringify({ home, away }));
    toast.success("Pick staged on this device", {
      description: "Server-side prediction writes will attach to this real fixture next.",
    });
  }

  return (
    <article className="premium-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MatchStatusPill status={match.status} />
            <span className="text-sm text-muted-foreground">{match.groupName ?? match.stage ?? match.round ?? "Fixture"}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{match.venueName ?? "Venue pending"}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-4 text-electric" />
          <LockCountdown kickoffAt={match.kickoffAt} />
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <TeamBadge team={match.homeTeam} />
        <div className="flex items-center justify-center gap-3">
          <ScoreStepper value={home} onChange={setHome} disabled={!canPick} />
          <ScoreStepper value={away} onChange={setAway} disabled={!canPick} />
        </div>
        <TeamBadge team={match.awayTeam} align="right" />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
        <BoostChip disabled={!canPick} />
        <PickReveal locked={locked} />
        <div className="rounded-xl border border-white/10 bg-[#071025] px-4 py-3 text-sm font-semibold">{points} projected pts</div>
      </div>

      <Button className="mt-5 w-full" disabled={!canPick} onClick={savePick}>
        <Save className="size-4" />
        {locked ? "Locked" : "Save pick"}
      </Button>
    </article>
  );
}
