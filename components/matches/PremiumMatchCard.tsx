"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MatchSummary } from "@/lib/data/worldCupData";
import { BoostChip } from "./BoostChip";
import { LockCountdown } from "./LockCountdown";
import { MatchStatusPill } from "./MatchStatusPill";
import { PickReveal } from "./PickReveal";
import { ScoreStepper } from "./ScoreStepper";
import { TeamBadge } from "./TeamBadge";

type SavedPick = {
  homeScore: number;
  awayScore: number;
  boostApplied: boolean;
  updatedAt: string;
  createdAt: string;
};

export function PremiumMatchCard({
  match,
  initialPick,
  signedIn,
}: {
  match: MatchSummary;
  initialPick?: SavedPick;
  signedIn: boolean;
}) {
  const [home, setHome] = useState(initialPick?.homeScore ?? 0);
  const [away, setAway] = useState(initialPick?.awayScore ?? 0);
  const [boost, setBoost] = useState(initialPick?.boostApplied ?? false);
  const [savedPick, setSavedPick] = useState<SavedPick | undefined>(initialPick);
  const [busy, setBusy] = useState<"save" | "cancel" | null>(null);
  const locked = new Date(match.kickoffAt).getTime() <= Date.now();
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const canPick = Boolean(signedIn && hasTeams && !locked);
  const projectedMax = useMemo(() => 12 + (boost ? 2 : 0), [boost]);

  async function savePick() {
    if (!canPick) return;
    setBusy("save");
    try {
      const response = await fetch("/api/predictions/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          boostApplied: boost,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);

      setSavedPick({
        homeScore: Number(payload.prediction.home_score ?? home),
        awayScore: Number(payload.prediction.away_score ?? away),
        boostApplied: Boolean(payload.prediction.boost_applied),
        updatedAt: String(payload.prediction.updated_at ?? new Date().toISOString()),
        createdAt: String(payload.prediction.created_at ?? new Date().toISOString()),
      });

      toast.success("Pick saved", {
        description: "You can update or cancel it until kickoff. It auto-locks at kickoff.",
      });
    } catch (error) {
      toast.error("Pick was not saved", {
        description: error instanceof Error ? error.message : "Try signing in again.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function cancelPick() {
    if (!savedPick || !canPick) return;
    setBusy("cancel");
    try {
      const response = await fetch("/api/predictions/save", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setSavedPick(undefined);
      toast.success("Pick cancelled");
    } catch (error) {
      toast.error("Pick was not cancelled", {
        description: error instanceof Error ? error.message : "Try again before kickoff.",
      });
    } finally {
      setBusy(null);
    }
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
        <BoostChip disabled={!canPick} selected={boost} onToggle={() => setBoost((value) => !value)} />
        <PickReveal locked={locked} />
        <div className="rounded-xl border border-white/10 bg-[#071025] px-4 py-3 text-sm font-semibold">
          Max {projectedMax} pts
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-muted-foreground">
        <span className="font-semibold text-foreground">Scoring:</span> outcome +3, exact +5, goal difference +2, one team goals +1,
        total goals +1, early save up to +2, wrong outcome -1. Boost adds +2 if your outcome is right or -1 if it is wrong.
      </div>

      {savedPick ? (
        <div className="mt-4 rounded-xl border border-pitch-green/25 bg-pitch-green/10 p-3 text-sm text-pitch-green">
          Saved: {savedPick.homeScore}-{savedPick.awayScore}
          {savedPick.boostApplied ? " with boost" : ""}. Auto-locks at kickoff.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        {signedIn ? (
          <Button disabled={!canPick || busy === "save"} onClick={savePick}>
            <Save className="size-4" />
            {locked ? "Locked" : savedPick ? "Update pick" : "Lock pick"}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login?message=Sign%20in%20to%20save%20your%20pick">
              <Save className="size-4" />
              Sign in to pick
            </Link>
          </Button>
        )}
        <Button variant="secondary" disabled={!savedPick || !canPick || busy === "cancel"} onClick={cancelPick}>
          <Trash2 className="size-4" />
          Cancel
        </Button>
      </div>
    </article>
  );
}
