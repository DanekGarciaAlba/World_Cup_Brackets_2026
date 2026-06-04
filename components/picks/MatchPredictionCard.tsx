"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Fixture } from "@/lib/demo-data";
import { fireExactScoreConfetti } from "@/components/effects/ConfettiBurst";

type MatchPredictionCardProps = {
  fixture: Fixture;
};

export function MatchPredictionCard({ fixture }: MatchPredictionCardProps) {
  const storageKey = `wcb26:pick:${fixture.id}`;
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(1);
  const [confidence, setConfidence] = useState("standard");
  const [boost, setBoost] = useState("none");

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { homeScore: number; awayScore: number; confidence: string; boost: string };
      setHomeScore(saved.homeScore);
      setAwayScore(saved.awayScore);
      setConfidence(saved.confidence);
      setBoost(saved.boost);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const pointsPreview = useMemo(() => {
    const outcome = homeScore === awayScore ? 2 : 3;
    const confidenceBonus = confidence === "high" ? 2 : confidence === "low" ? 0 : 1;
    const boostBonus = boost === "exact" ? 5 : boost === "underdog" ? 3 : 0;
    return outcome + confidenceBonus + boostBonus;
  }, [awayScore, boost, confidence, homeScore]);

  function savePick() {
    window.localStorage.setItem(storageKey, JSON.stringify({ homeScore, awayScore, confidence, boost }));
    if (boost === "exact") fireExactScoreConfetti();
    toast.success("Pick saved on this device", {
      description: "The backend write endpoint is scaffolded and ready for the final lock-aware save logic.",
    });
  }

  const locked = fixture.lockState === "locked";

  return (
    <article className="app-panel rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={fixture.lockState === "open" ? "default" : "secondary"}>{fixture.lockState}</Badge>
            <span className="text-xs text-muted-foreground">{fixture.round}</span>
          </div>
          <p className="text-sm text-muted-foreground">{fixture.venue}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-4 text-primary" />
          {fixture.kickoff}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] items-center gap-3">
        <TeamSide name={fixture.home.name} code={fixture.home.code} color={fixture.home.color} />
        <div className="grid grid-cols-2 gap-2">
          <ScoreInput value={homeScore} onChange={setHomeScore} disabled={locked} />
          <ScoreInput value={awayScore} onChange={setAwayScore} disabled={locked} />
        </div>
        <TeamSide name={fixture.away.name} code={fixture.away.code} color={fixture.away.color} align="right" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Confidence</Label>
          <Select value={confidence} onValueChange={setConfidence} disabled={locked}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Boost</Label>
          <Select value={boost} onValueChange={setBoost} disabled={locked}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="exact">Exact score</SelectItem>
              <SelectItem value="underdog">Underdog</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Preview</Label>
          <div className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-background/55 px-3 text-sm">
            <span>{pointsPreview} pts</span>
            {locked ? <Lock className="size-4 text-destructive" /> : null}
          </div>
        </div>
      </div>

      <Button className="mt-5 w-full sm:w-auto" onClick={savePick} disabled={locked}>
        <Save className="size-4" />
        Save pick
      </Button>
    </article>
  );
}

function TeamSide({ name, code, color, align = "left" }: { name: string; code: string; color: string; align?: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/15 text-xs font-semibold" style={{ background: color, color: "#04111f" }}>
        {code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight sm:text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">Group pick</p>
      </div>
    </div>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  return (
    <input
      suppressHydrationWarning
      aria-label="Predicted score"
      type="number"
      min={0}
      max={12}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="score-input h-14 w-full rounded-lg border border-border bg-background/70 text-center text-2xl font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
    />
  );
}
