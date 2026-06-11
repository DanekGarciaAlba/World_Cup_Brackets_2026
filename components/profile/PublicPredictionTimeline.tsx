"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { CalendarDays, Lock } from "lucide-react";
import { getWorldCupTeamFlagPath } from "@/lib/data/worldCupTeams";
import {
  getPublicPredictionFocusIndex,
  type PublicPredictionPreview,
  type PublicPredictionTeam,
} from "@/lib/privacy/publicPredictionPreview";
import { formatEasternDate, formatEasternDateTime } from "@/lib/utils/easternTime";
import { cn } from "@/lib/utils";

export function PublicPredictionTimeline({ predictions }: { predictions: PublicPredictionPreview[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusIndex = useMemo(() => getPublicPredictionFocusIndex(predictions), [predictions]);
  const focusId = focusIndex >= 0 ? predictions[focusIndex]?.id : null;
  const savedAt = predictions.find((prediction) => prediction.revealed && prediction.savedAt)?.savedAt ?? null;
  const hiddenCount = predictions.filter((prediction) => !prediction.revealed).length;

  useEffect(() => {
    if (!focusId) return;
    const target = containerRef.current?.querySelector(`[data-prediction-id="${focusId}"]`);
    target?.scrollIntoView({ block: "center" });
  }, [focusId]);

  return (
    <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-white/10 bg-[#020713]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-[#bcb8ff]" />
          <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#bcb8ff]">Predictions</p>
        </div>
        <span className="shrink-0 rounded-lg border border-[#d8b157]/22 bg-[#d8b157]/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#d8b157]">
          {hiddenCount > 0 ? `${hiddenCount} locked` : `${predictions.length} matches`}
        </span>
      </div>

      <div ref={containerRef} className="public-prediction-timeline mt-3 grid min-h-0 content-start gap-2 overflow-y-auto pr-1">
        {predictions.length > 0 ? (
          predictions.map((prediction) => <PredictionRow key={prediction.id} prediction={prediction} focused={prediction.id === focusId} />)
        ) : (
          <EmptyPredictionBlock title="No visible match picks yet">
            Saved score predictions appear here after each fixture reaches its pick deadline.
          </EmptyPredictionBlock>
        )}
      </div>

      <p className="mt-3 text-right text-xs font-bold text-white/42">
        {savedAt ? `Latest revealed pick saved ${formatEasternDate(savedAt)}` : hiddenCount > 0 ? "Scores reveal after lock" : "Synced fixture preview"}
      </p>
    </section>
  );
}

function PredictionRow({ prediction, focused }: { prediction: PublicPredictionPreview; focused: boolean }) {
  const homeName = prediction.homeTeam?.name ?? "Team pending";
  const awayName = prediction.awayTeam?.name ?? "Team pending";
  const score = prediction.homeScore == null || prediction.awayScore == null ? "--" : `${prediction.homeScore} - ${prediction.awayScore}`;

  return (
    <article
      data-prediction-id={prediction.id}
      className={cn(
        "grid min-h-[74px] scroll-my-6 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        focused && "border-[#d8b157]/34 bg-[#d8b157]/[0.075]",
      )}
    >
      <PredictionTeam team={prediction.homeTeam} name={homeName} />
      <div className="grid justify-items-center gap-1">
        <span className="max-w-[5.7rem] truncate text-[0.52rem] font-black uppercase tracking-[0.12em] text-white/38">
          {prediction.matchLabel}
        </span>
        {prediction.revealed ? (
          <span className="grid h-11 min-w-16 place-items-center rounded-lg border border-[#d8b157]/20 bg-[#d8b157]/10 px-2 font-mono text-lg font-black text-[#f0d38b]">
            {score}
          </span>
        ) : (
          <span className="grid h-11 min-w-[4.35rem] place-items-center rounded-lg border border-white/10 bg-[#071126]/86 px-2 text-center text-[0.56rem] font-black uppercase leading-tight tracking-[0.1em] text-white/52" title={`Reveals after ${formatRevealAt(prediction.revealAt)}`}>
            <Lock className="mb-0.5 size-3 text-[#d8b157]" />
            Locked
          </span>
        )}
      </div>
      <PredictionTeam team={prediction.awayTeam} name={awayName} align="right" />
    </article>
  );
}

function PredictionTeam({ team, name, align = "left" }: { team: PublicPredictionTeam | null; name: string; align?: "left" | "right" }) {
  const flagPath = getWorldCupTeamFlagPath(team);
  const code = team?.code ?? name.slice(0, 3).toUpperCase();

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", align === "right" ? "flex-row-reverse text-right" : "")}>
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-white/[0.06] shadow-[0_0_18px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.10)]">
        {flagPath ? <img src={flagPath} alt="" className="h-full w-full object-cover" /> : <span className="text-[0.58rem] font-black text-white/70">{code}</span>}
      </span>
      <span className="min-w-0 truncate text-sm font-black leading-none text-white">{name}</span>
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
