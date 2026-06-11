"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Info, Radio, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MatchSummary, TeamSummary } from "@/lib/data/worldCupData";
import { getMatchProjectedMax } from "@/lib/scoring/pointsSystem";
import { LockCountdown } from "./LockCountdown";
import { MatchStatusPill } from "./MatchStatusPill";
import { PickReveal } from "./PickReveal";
import { ScoreStepper } from "./ScoreStepper";

type SavedPick = {
  homeScore: number;
  awayScore: number;
  predictedAdvancerTeamId?: number | null;
  boostApplied: boolean;
  meaningfulUpdatedAt?: string;
  updatedAt: string;
  createdAt: string;
};

type ScoreDetailReason = {
  code?: string;
  label?: string;
  description?: string;
  points?: number | string;
};

type ScoreDetail = {
  matchLabel: string;
  status: string;
  predictedScoreLabel: string | null;
  actualScoreLabel: string | null;
  points: number | null;
  timingMultiplier: number | null;
  basePoints: number | null;
  finalPoints: number | null;
  exactScore: boolean;
  correctOutcome: boolean;
  reasons: ScoreDetailReason[];
  savedAt: string | null;
  scoredAt: string | null;
};

function isKnockoutMatch(match: MatchSummary) {
  const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
  return !match.groupName || text.includes("round of 32") || text.includes("round of 16") || text.includes("quarter") || text.includes("semi") || text.includes("final") || text.includes("third");
}

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
  const [advancerTeamId, setAdvancerTeamId] = useState<number | null>(initialPick?.predictedAdvancerTeamId ?? null);
  const [savedPick, setSavedPick] = useState<SavedPick | undefined>(initialPick);
  const [busy, setBusy] = useState<"save" | "cancel" | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [scoreDetailOpen, setScoreDetailOpen] = useState(false);
  const [scoreDetailBusy, setScoreDetailBusy] = useState(false);
  const [scoreDetailError, setScoreDetailError] = useState<string | null>(null);
  const [scoreDetail, setScoreDetail] = useState<ScoreDetail | null>(null);
  const kickoffTime = new Date(match.kickoffAt).getTime();
  const isLive = match.status === "live" || match.status === "halftime";
  const isFinished = match.status === "finished";
  const finalHomeScore = typeof match.homeScore === "number" ? match.homeScore : null;
  const finalAwayScore = typeof match.awayScore === "number" ? match.awayScore : null;
  const hasFinalScore = isFinished && finalHomeScore !== null && finalAwayScore !== null;
  const locked = isFinished || !Number.isFinite(kickoffTime) || kickoffTime <= Date.now();
  const pickLocked = locked || isLive;
  const hasTeams = Boolean(match.homeTeam && match.awayTeam);
  const knockout = isKnockoutMatch(match);
  const canPick = Boolean(signedIn && hasTeams && !pickLocked);
  const canShowScoreDetail = Boolean(signedIn && pickLocked);
  const projectedMax = getMatchProjectedMax(knockout, match.stage ?? match.round ?? null);
  const savedAdvancerTeam = [match.homeTeam, match.awayTeam].find((team) => team?.id === savedPick?.predictedAdvancerTeamId);
  const currentAdvancerTeamId = knockout ? advancerTeamId : null;
  const hasUnsavedChanges = Boolean(
    savedPick &&
      (savedPick.homeScore !== home ||
        savedPick.awayScore !== away ||
        (savedPick.predictedAdvancerTeamId ?? null) !== currentAdvancerTeamId),
  );
  const statusLabel = hasFinalScore
    ? "Final score"
    : isLive
      ? "Live - locked"
      : savedPick
        ? hasUnsavedChanges
          ? "Unsaved update"
          : "Pick locked"
        : "Missing pick";
  const saveLabel = hasFinalScore ? "Final" : isLive ? "Live locked" : pickLocked ? "Locked" : savedPick ? (hasUnsavedChanges ? "Update locked pick" : "Pick locked in") : "Lock pick";
  const lockedDescription = isLive
    ? "Picks are locked because this game is live."
    : hasFinalScore
      ? "Picks are locked because this game is final."
      : "Picks are locked for this fixture.";

  useEffect(() => {
    if (!knockout || !match.homeTeam || !match.awayTeam) return;
    if (home > away) setAdvancerTeamId(match.homeTeam.id);
    if (away > home) setAdvancerTeamId(match.awayTeam.id);
  }, [away, home, knockout, match.awayTeam, match.homeTeam]);

  function notifyLockedAttempt() {
    toast.warning("Picks locked", {
      description: lockedDescription,
    });
  }

  async function savePick() {
    if (!canPick) {
      notifyLockedAttempt();
      return;
    }
    if (knockout && !advancerTeamId) {
      toast.warning("Choose who advances", {
        description: "Knockout picks need an advancing team, especially for tied scores.",
      });
      return;
    }
    setBusy("save");
    try {
      const response = await fetch("/api/predictions/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          predictedAdvancerTeamId: knockout ? advancerTeamId : null,
          boostApplied: false,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);

      setSavedPick({
        homeScore: Number(payload.prediction.home_score ?? home),
        awayScore: Number(payload.prediction.away_score ?? away),
        predictedAdvancerTeamId:
          payload.prediction.predicted_advancer_team_id === null ? null : Number(payload.prediction.predicted_advancer_team_id ?? advancerTeamId),
        boostApplied: false,
        meaningfulUpdatedAt: String(payload.prediction.meaningful_updated_at ?? new Date().toISOString()),
        updatedAt: String(payload.prediction.updated_at ?? new Date().toISOString()),
        createdAt: String(payload.prediction.created_at ?? new Date().toISOString()),
      });
      window.dispatchEvent(new CustomEvent("world-cup:match-pick", { detail: { matchId: match.id, saved: true } }));

      toast.success(savedPick ? "Pick updated" : "Pick locked in", {
        description: "Opponents can only see it after kickoff lock.",
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
    if (!savedPick) return;
    if (!canPick) {
      notifyLockedAttempt();
      return;
    }
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
      setUnlockOpen(false);
      window.dispatchEvent(new CustomEvent("world-cup:match-pick", { detail: { matchId: match.id, saved: false } }));
      toast.success("Pick unlocked", {
        description: "Save again before kickoff if you want this fixture counted.",
      });
    } catch (error) {
      toast.error("Pick was not cancelled", {
        description: error instanceof Error ? error.message : "Try again before kickoff.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function openScoreDetail() {
    setScoreDetailOpen(true);
    if (scoreDetail || scoreDetailBusy) return;
    setScoreDetailBusy(true);
    setScoreDetailError(null);
    try {
      const response = await fetch(`/api/predictions/score-detail?matchId=${match.id}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setScoreDetail(payload as ScoreDetail);
    } catch (error) {
      setScoreDetailError(error instanceof Error ? error.message : "Point audit is unavailable right now.");
    } finally {
      setScoreDetailBusy(false);
    }
  }

  return (
    <article className={`premium-card p-5 ${isLive ? "match-card-live" : ""} ${hasFinalScore ? "match-card-final" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MatchStatusPill status={match.status} />
            <span className="text-sm font-semibold text-muted-foreground">{match.groupName ?? match.stage ?? match.round ?? "Fixture"}</span>
            <span
              className={`rounded-full border px-2 py-1 text-[0.66rem] font-black uppercase tracking-[0.1em] ${
                hasFinalScore
                  ? "border-trophy-gold/45 bg-trophy-gold/15 text-trophy-gold"
                  : savedPick && !hasUnsavedChanges
                  ? "border-pitch-green/30 bg-pitch-green/10 text-pitch-green"
                  : hasUnsavedChanges
                    ? "border-electric/35 bg-electric/12 text-electric"
                  : "border-trophy-gold/25 bg-trophy-gold/10 text-trophy-gold"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{match.venueName ?? "Venue pending"}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-muted-foreground">
            {isLive ? <Radio className="size-4 text-live-red" /> : <CalendarClock className="size-4 text-electric" />}
            {isLive ? (
              <span className="text-sm font-black uppercase tracking-[0.08em] text-live-red">Live</span>
            ) : hasFinalScore ? (
              <span className="text-sm font-semibold text-trophy-gold">Final</span>
            ) : (
              <LockCountdown kickoffAt={match.kickoffAt} />
            )}
          </div>
          {canShowScoreDetail ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-10 rounded-full border-white/10 bg-white/[0.055]"
              aria-label="View point audit"
              title="View point audit"
              onClick={openScoreDetail}
            >
              <Info className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {hasFinalScore ? (
        <div className="match-final-score-strip mt-5">
          <span>Final score</span>
          <strong>
            {match.homeTeam?.name ?? "Home"} {finalHomeScore} - {finalAwayScore} {match.awayTeam?.name ?? "Away"}
          </strong>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <PickTeamPanel
          team={match.homeTeam}
          score={home}
          actualScore={hasFinalScore ? finalHomeScore : null}
          onScoreChange={setHome}
          disabled={!canPick}
          onLockedAttempt={signedIn && pickLocked && !hasFinalScore ? notifyLockedAttempt : undefined}
          side="home"
        />
        <PickTeamPanel
          team={match.awayTeam}
          score={away}
          actualScore={hasFinalScore ? finalAwayScore : null}
          onScoreChange={setAway}
          disabled={!canPick}
          onLockedAttempt={signedIn && pickLocked && !hasFinalScore ? notifyLockedAttempt : undefined}
          side="away"
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <PickReveal locked={pickLocked} />
        <div className="rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
          Max {projectedMax} pts
        </div>
      </div>

      {knockout && match.homeTeam && match.awayTeam ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">Advances</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[match.homeTeam, match.awayTeam].map((team) => (
              <button
                key={team.id}
                type="button"
                disabled={!canPick || (home !== away && ((home > away && team.id !== match.homeTeam?.id) || (away > home && team.id !== match.awayTeam?.id)))}
                className={`min-h-11 rounded-lg border px-3 text-left text-sm font-black transition ${
                  advancerTeamId === team.id
                    ? "border-trophy-gold/60 bg-trophy-gold/15 text-foreground shadow-[0_0_20px_rgba(214,178,96,.18)]"
                    : "border-white/10 bg-white/[0.045] text-muted-foreground hover:border-white/20 hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-45`}
                onClick={() => setAdvancerTeamId(team.id)}
              >
                {team.name}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            Tied knockout scores are allowed when you select who advances on penalties.
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-muted-foreground">
        <span className="font-semibold text-foreground">Scoring:</span> outcome/advancer +4, exact +6, goal difference +2,
        team goals +1 each. Timing runs from 1.35x to 0.60x, then knockout-stage match multipliers apply.
      </div>

      {savedPick ? (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
            hasUnsavedChanges
              ? "border-electric/25 bg-electric/10 text-[#bfc9ff]"
              : "border-pitch-green/30 bg-pitch-green/10 text-pitch-green"
          }`}
        >
          <span className="flex items-start gap-2">
            {hasUnsavedChanges ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-electric" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pitch-green" />}
            <span>
              {hasUnsavedChanges ? "Changes are not locked yet. " : "Locked in: "}
              {savedPick.homeScore}-{savedPick.awayScore}
              {savedAdvancerTeam ? `, advances ${savedAdvancerTeam.name}` : ""}. Opponents see it after kickoff lock.
            </span>
          </span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        {signedIn ? (
          <Button
            disabled={!hasTeams || busy === "save"}
            onClick={savePick}
            className={
              pickLocked
                ? "border-white/10 bg-white/[0.055] text-muted-foreground shadow-none hover:bg-white/[0.075]"
                : savedPick && !hasUnsavedChanges
                ? "border-pitch-green/45 bg-pitch-green text-[#04120a] shadow-[0_0_28px_rgba(139,216,111,.22)] hover:bg-pitch-green/90"
                : undefined
            }
          >
            {savedPick && !hasUnsavedChanges ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
            {saveLabel}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login?message=Sign%20in%20to%20save%20your%20pick">
              <Save className="size-4" />
              Sign in to pick
            </Link>
          </Button>
        )}
        <Button variant="secondary" disabled={!savedPick || busy === "cancel"} onClick={() => (canPick ? setUnlockOpen(true) : notifyLockedAttempt())}>
          <Trash2 className="size-4" />
          Unlock pick
        </Button>
      </div>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="wc-kit-dialog max-w-md border border-trophy-gold/20 bg-[#071126] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <AlertTriangle className="size-5 text-trophy-gold" />
              Unlock this pick?
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold leading-6 text-muted-foreground">
              Removing it clears the saved time. If you save again later, timing points may be lower.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-white/10 bg-white/[0.035]">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Keep pick
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={busy === "cancel"} onClick={cancelPick}>
              <Trash2 className="size-4" />
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scoreDetailOpen} onOpenChange={setScoreDetailOpen}>
        <DialogContent className="wc-kit-dialog max-w-lg border border-trophy-gold/20 bg-[#071126] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Info className="size-5 text-trophy-gold" />
              Point audit
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold leading-6 text-muted-foreground">
              Your saved pick, final result, and stored scoring breakdown for this fixture.
            </DialogDescription>
          </DialogHeader>

          {scoreDetailBusy ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold text-muted-foreground">Loading point audit...</div>
          ) : scoreDetailError ? (
            <div className="rounded-xl border border-live-red/30 bg-live-red/10 p-4 text-sm font-semibold text-white">{scoreDetailError}</div>
          ) : scoreDetail ? (
            <div className="grid gap-3">
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-3">
                <AuditMetric label="Pick" value={scoreDetail.predictedScoreLabel ?? "--"} />
                <AuditMetric label="Actual" value={scoreDetail.actualScoreLabel ?? "--"} />
                <AuditMetric label="Points" value={scoreDetail.points === null ? "Pending" : `+${scoreDetail.points}`} tone="gold" />
              </div>
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-3">
                <AuditMetric label="Base" value={scoreDetail.basePoints === null ? "--" : String(scoreDetail.basePoints)} />
                <AuditMetric label="Final" value={scoreDetail.finalPoints === null ? "--" : String(scoreDetail.finalPoints)} />
                <AuditMetric label="Timing" value={scoreDetail.timingMultiplier === null ? "--" : `${scoreDetail.timingMultiplier}x`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-muted-foreground">
                  {scoreDetail.correctOutcome ? "Correct outcome" : "Outcome missed"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-muted-foreground">
                  {scoreDetail.exactScore ? "Exact score" : "Not exact"}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-trophy-gold">Scoring reasons</p>
                <div className="mt-2 grid gap-2">
                  {scoreDetail.reasons.length > 0 ? (
                    scoreDetail.reasons.map((reason, index) => (
                      <div key={`${reason.code ?? "reason"}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#020713]/50 px-3 py-2 text-sm">
                        <span className="font-semibold text-white/78">{reason.description ?? reason.label ?? reason.code ?? "Scoring rule"}</span>
                        {reason.points === undefined ? null : <strong className="font-mono text-trophy-gold">+{reason.points}</strong>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">Points appear here after the fixture is scored.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </article>
  );
}

function AuditMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-mono text-lg font-black ${tone === "gold" ? "text-trophy-gold" : "text-white"}`}>{value}</p>
    </div>
  );
}

function PickTeamPanel({
  team,
  score,
  actualScore,
  onScoreChange,
  disabled,
  onLockedAttempt,
  side,
}: {
  team: TeamSummary | null;
  score: number;
  actualScore: number | null;
  onScoreChange: (value: number) => void;
  disabled: boolean;
  onLockedAttempt?: () => void;
  side: "home" | "away";
}) {
  const code = team?.code ?? team?.name.slice(0, 3).toUpperCase() ?? "TBD";

  return (
    <section
      className="grid min-h-[10rem] min-w-0 grid-rows-[auto_1fr] gap-3 rounded-2xl border border-white/10 bg-[#071126]/56 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
      onClickCapture={() => {
        if (disabled && onLockedAttempt) onLockedAttempt();
      }}
    >
      <div className={`flex min-w-0 items-center gap-3 ${side === "away" ? "md:flex-row-reverse md:text-right" : ""}`}>
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-trophy-gold/25 bg-[#111d3d] text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1)]">
          {team?.logoUrl ? <img src={team.logoUrl} alt="" className="h-10 w-10 object-contain" /> : code}
        </div>
        <div className="min-w-0">
          <p className="break-words text-base font-black leading-tight text-white">{team?.name ?? "Team pending"}</p>
          <p className="mt-1 break-words text-xs font-semibold leading-tight text-muted-foreground">{team?.country ?? "Official slot pending"}</p>
        </div>
      </div>
      <div className="grid min-w-0 content-end justify-items-center">
        {actualScore !== null ? (
          <div className="match-final-score-badge">
            <span>Final</span>
            <strong>{actualScore}</strong>
          </div>
        ) : (
          <ScoreStepper value={score} onChange={onScoreChange} disabled={disabled} />
        )}
      </div>
    </section>
  );
}
