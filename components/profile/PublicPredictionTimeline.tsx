"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getWorldCupTeamFlagPath } from "@/lib/data/worldCupTeams";
import {
  getPublicPredictionFocusIndex,
  type PublicPredictionPreview,
  type PublicPredictionTeam,
} from "@/lib/privacy/publicPredictionPreview";
import { formatEasternDate, formatEasternDateTime } from "@/lib/utils/easternTime";
import { cn } from "@/lib/utils";

type ScoreDetailReason = {
  code?: string;
  label?: string;
  description?: string;
  points?: number | string;
};

type ScoreDetail = {
  matchLabel: string;
  status: string;
  hasPrediction?: boolean;
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

export function PublicPredictionTimeline({ predictions, profileUserId }: { predictions: PublicPredictionPreview[]; profileUserId?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusIndex = useMemo(() => getPublicPredictionFocusIndex(predictions), [predictions]);
  const focusId = focusIndex >= 0 ? predictions[focusIndex]?.id : null;
  const savedAt = predictions.find((prediction) => prediction.revealed && prediction.savedAt)?.savedAt ?? null;
  const hiddenCount = predictions.filter((prediction) => !prediction.revealed).length;
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [scoreDetail, setScoreDetail] = useState<ScoreDetail | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const target = containerRef.current?.querySelector(`[data-prediction-id="${focusId}"]`);
    target?.scrollIntoView({ block: "center" });
  }, [focusId]);

  async function openAudit(matchId: number) {
    if (!profileUserId) return;
    setAuditOpen(true);
    setAuditBusy(true);
    setAuditError(null);
    setScoreDetail(null);
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(profileUserId)}/score-detail?matchId=${matchId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setScoreDetail(payload as ScoreDetail);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Point audit is unavailable right now.");
    } finally {
      setAuditBusy(false);
    }
  }

  return (
    <>
      <section className="grid h-[430px] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-white/10 bg-[#020713]/92 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-3 xl:h-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-[#bcb8ff]" />
            <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#bcb8ff]">Predictions</p>
          </div>
          <span className="shrink-0 rounded-lg border border-[#d8b157]/22 bg-[#d8b157]/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#d8b157]">
            {hiddenCount > 0 ? `${hiddenCount} locked` : `${predictions.length} matches`}
          </span>
        </div>

        <div ref={containerRef} className="public-prediction-timeline mt-2.5 grid min-h-0 content-start gap-2 overflow-y-auto pr-1 md:mt-3">
          {predictions.length > 0 ? (
            predictions.map((prediction) => (
              <PredictionRow
                key={prediction.id}
                prediction={prediction}
                focused={prediction.id === focusId}
                onAudit={profileUserId ? openAudit : undefined}
              />
            ))
          ) : (
            <EmptyPredictionBlock title="No visible match picks yet">
              Saved score predictions appear here after each fixture reaches its pick deadline.
            </EmptyPredictionBlock>
          )}
        </div>

        <p className="mt-2.5 text-right text-[0.7rem] font-bold text-white/42 md:mt-3 md:text-xs">
          {savedAt ? `Latest revealed pick saved ${formatEasternDate(savedAt)}` : hiddenCount > 0 ? "Scores reveal after lock" : "Synced fixture preview"}
        </p>
      </section>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="wc-kit-dialog max-w-lg border border-[#d8b157]/20 bg-[#071126] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Info className="size-5 text-[#d8b157]" />
              Public point audit
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold leading-6 text-white/52">
              Revealed pick, final result, and stored scoring breakdown for this fixture.
            </DialogDescription>
          </DialogHeader>

          {auditBusy ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold text-white/52">Loading point audit...</div>
          ) : auditError ? (
            <div className="rounded-xl border border-live-red/30 bg-live-red/10 p-4 text-sm font-semibold text-white">{auditError}</div>
          ) : scoreDetail ? (
            <div className="grid gap-3">
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-3">
                <AuditMetric label="Pick" value={scoreDetail.predictedScoreLabel ?? "--"} />
                <AuditMetric label="Actual" value={scoreDetail.actualScoreLabel ?? "--"} />
                <AuditMetric
                  label="Points"
                  value={scoreDetail.hasPrediction === false ? "No pick" : scoreDetail.points === null ? "Pending" : `+${scoreDetail.points}`}
                  tone="gold"
                />
              </div>
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-3">
                <AuditMetric label="Base" value={scoreDetail.basePoints === null ? "--" : String(scoreDetail.basePoints)} />
                <AuditMetric label="Final" value={scoreDetail.finalPoints === null ? "--" : String(scoreDetail.finalPoints)} />
                <AuditMetric label="Timing" value={scoreDetail.timingMultiplier === null ? "--" : `${scoreDetail.timingMultiplier}x`} />
              </div>
              <div className="flex flex-wrap gap-2">
                {scoreDetail.hasPrediction === false ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-white/52">No saved pick</span>
                ) : (
                  <>
                    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-white/52">
                      {scoreDetail.correctOutcome ? "Correct outcome" : "Outcome missed"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-white/52">
                      {scoreDetail.exactScore ? "Exact score" : "Not exact"}
                    </span>
                  </>
                )}
                {scoreDetail.savedAt ? (
                  <span className="rounded-full border border-pitch-green/20 bg-pitch-green/10 px-3 py-1 text-xs font-black text-pitch-green">
                    Saved {formatEasternDateTime(scoreDetail.savedAt)}
                  </span>
                ) : null}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#d8b157]">Scoring reasons</p>
                <div className="mt-2 grid gap-2">
                  {scoreDetail.reasons.length > 0 ? (
                    scoreDetail.reasons.map((reason, index) => (
                      <div key={`${reason.code ?? "reason"}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#020713]/50 px-3 py-2 text-sm">
                        <span className="font-semibold text-white/78">{reason.description ?? reason.label ?? reason.code ?? "Scoring rule"}</span>
                        {reason.points === undefined ? null : <strong className="font-mono text-[#d8b157]">+{reason.points}</strong>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-white/46">
                      {scoreDetail.hasPrediction === false ? "No saved pick was found for this fixture." : "Points appear here after the fixture is scored."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PredictionRow({
  prediction,
  focused,
  onAudit,
}: {
  prediction: PublicPredictionPreview;
  focused: boolean;
  onAudit?: (matchId: number) => void;
}) {
  const homeName = prediction.homeTeam?.name ?? "Team pending";
  const awayName = prediction.awayTeam?.name ?? "Team pending";
  const score = prediction.homeScore == null || prediction.awayScore == null ? "--" : `${prediction.homeScore} - ${prediction.awayScore}`;
  const canAudit = Boolean(prediction.revealed && prediction.savedAt && onAudit);

  return (
    <article
      data-prediction-id={prediction.id}
      className={cn(
        "grid min-h-[62px] scroll-my-6 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:min-h-[74px] md:gap-3 md:px-3",
        focused && "border-[#d8b157]/34 bg-[#d8b157]/[0.075]",
      )}
    >
      <PredictionTeam team={prediction.homeTeam} name={homeName} />
      <div className="grid justify-items-center gap-1">
        <span className="max-w-[5.7rem] truncate text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/38">
          {prediction.matchLabel}
        </span>
        {prediction.revealed ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="grid h-9 min-w-12 place-items-center rounded-lg border border-[#d8b157]/20 bg-[#d8b157]/10 px-2 font-mono text-sm font-black text-[#f0d38b] md:h-11 md:min-w-16 md:text-lg">
              {score}
            </span>
            {canAudit ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="size-8 shrink-0 rounded-lg border-white/10 bg-white/[0.055] text-white/70 hover:text-white md:size-9"
                aria-label="View public point audit"
                title="View public point audit"
                onClick={() => onAudit?.(prediction.id)}
              >
                <Info className="size-4" />
              </Button>
            ) : null}
          </span>
        ) : (
          <span className="grid h-9 min-w-[3.6rem] place-items-center rounded-lg border border-white/10 bg-[#071126]/86 px-2 text-center text-[0.5rem] font-black uppercase leading-tight tracking-[0.1em] text-white/52 md:h-11 md:min-w-[4.35rem] md:text-[0.56rem]" title={`Reveals after ${formatRevealAt(prediction.revealAt)}`}>
            <Lock className="mb-0.5 size-3 text-[#d8b157]" />
            Locked
          </span>
        )}
      </div>
      <PredictionTeam team={prediction.awayTeam} name={awayName} align="right" />
    </article>
  );
}

function AuditMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/44">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-lg font-black", tone === "gold" ? "text-[#d8b157]" : "text-white")}>{value}</p>
    </div>
  );
}

function PredictionTeam({ team, name, align = "left" }: { team: PublicPredictionTeam | null; name: string; align?: "left" | "right" }) {
  const flagPath = getWorldCupTeamFlagPath(team);
  const code = team?.code ?? name.slice(0, 3).toUpperCase();

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5 md:gap-2", align === "right" ? "flex-row-reverse text-right" : "")}>
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/[0.06] shadow-[0_0_18px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.10)] md:size-10">
        {flagPath ? <img src={flagPath} alt="" className="h-full w-full object-cover" /> : <span className="text-[0.58rem] font-black text-white/70">{code}</span>}
      </span>
      <span className="min-w-0 truncate text-xs font-black leading-none text-white md:text-sm">{name}</span>
    </div>
  );
}

function EmptyPredictionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#071126]/68 p-4">
      <img src="/assets/ui/trophy.png" alt="" className="mb-3 h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(216,177,87,.35)]" />
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{children}</p>
    </div>
  );
}

function formatRevealAt(value?: string | null) {
  if (!value) return "the deadline";
  return formatEasternDateTime(value);
}
