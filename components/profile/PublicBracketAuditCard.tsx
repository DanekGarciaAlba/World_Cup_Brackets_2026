"use client";

import { Check, Clock3, Info, Lock, ShieldCheck, Trophy } from "lucide-react";
import { useState } from "react";
import type { DefaultPickSource } from "@/lib/bracket/defaultPredictionMetadata";
import type { ProfileBracketSummary } from "@/lib/profile/bracketSummary";
import { formatEasternDate, formatEasternDateTime } from "@/lib/utils/easternTime";
import { cn } from "@/lib/utils";

type AuditTab = "groups" | "top8" | "path";

export type PublicAuditTeam = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  flagPath: string | null;
};

export type PublicGroupAuditRow = {
  group: string;
  savedAt: string | null;
  released: boolean;
  points: number | null;
  predicted: PublicAuditTeam[];
  actual: PublicAuditTeam[];
  reasons: Array<{ code?: string; description?: string; points?: number | string }>;
  source?: DefaultPickSource | null;
};

export type PublicTop8AuditRow = {
  team: PublicAuditTeam;
  group: string | null;
  savedAt: string | null;
  correct: boolean | null;
  points: number | null;
  source?: DefaultPickSource | null;
};

export type PublicBracketAudit = {
  bracketRevealAt: string;
  pathHiddenUntilReveal: boolean;
  hasSavedPath: boolean;
  savedPathAt: string | null;
  groups: PublicGroupAuditRow[];
  top8: {
    savedAt: string | null;
    scoreReleased: boolean;
    points: number | null;
    picks: PublicTop8AuditRow[];
  };
};

type PublicBracketAuditCardProps = {
  audit: PublicBracketAudit;
  summary: ProfileBracketSummary | null;
};

export function PublicBracketAuditCard({ audit, summary }: PublicBracketAuditCardProps) {
  const [activeTab, setActiveTab] = useState<AuditTab>("groups");
  const groupPoints = audit.groups.reduce((sum, group) => sum + Math.max(0, group.points ?? 0), 0);
  const top8Points = audit.top8.points ?? 0;
  const tabs: Array<{ id: AuditTab; label: string; value: string; icon: typeof ShieldCheck }> = [
    { id: "groups", label: "Groups", value: `${groupPoints} pts`, icon: ShieldCheck },
    { id: "top8", label: "Top 8", value: audit.top8.scoreReleased ? `${top8Points} pts` : "Pending", icon: Trophy },
    { id: "path", label: "Path", value: audit.pathHiddenUntilReveal ? "Hidden" : audit.hasSavedPath ? "Revealed" : "None", icon: Lock },
  ];

  return (
    <section className="min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#020713]/92 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mb-2 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/42">Bracket card</p>
            <h2 className="mt-0.5 truncate text-xl font-black leading-none text-white">Bracket audit</h2>
          </div>
          <span className="rounded-full border border-[#d8b157]/30 bg-[#d8b157]/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.1em] text-[#d8b157]">
            Public
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn("min-h-11 rounded-md px-2 py-1 text-left transition active:scale-[0.98]", active ? "bg-[#d8b157] text-[#101114]" : "text-white/54 hover:bg-white/[0.07] hover:text-white")}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate text-[0.62rem] font-black uppercase tracking-[0.08em]">{tab.label}</span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-[0.68rem] font-black">{tab.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "groups" ? <GroupsAuditTab groups={audit.groups} /> : null}
      {activeTab === "top8" ? <Top8AuditTab top8={audit.top8} /> : null}
      {activeTab === "path" ? <PathAuditTab audit={audit} summary={summary} /> : null}
    </section>
  );
}

function GroupsAuditTab({ groups }: { groups: PublicGroupAuditRow[] }) {
  return (
    <div className="grid max-h-[318px] gap-1.5 overflow-y-auto pr-1 md:max-h-[338px]">
      {groups.map((group) => (
        <article key={group.group} className="rounded-lg border border-white/10 bg-[#071126]/68 p-2">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-black text-white">Group {group.group}</span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[0.54rem] font-black uppercase tracking-[0.1em]", group.released ? "border-pitch-green/20 bg-pitch-green/10 text-pitch-green" : "border-white/10 bg-white/[0.055] text-white/42")}>
                  {group.released ? "Released" : "Pending"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-0.5 text-[0.54rem] font-black uppercase tracking-[0.08em] text-white/46">
                  {group.savedAt ? `Saved ${formatEasternDate(group.savedAt)}` : "Not saved"}
                </span>
                {group.source ? <SourcePill source={group.source} /> : null}
              </span>
              <span className="mt-0.5 block truncate text-[0.62rem] font-bold text-white/42">{group.savedAt ? formatEasternDateTime(group.savedAt) : "No saved timestamp"}</span>
            </span>
            <span className={cn("font-mono text-lg font-black leading-none", group.points === null ? "text-white/32" : "text-[#d8b157]")}>{group.points === null ? "--" : `+${group.points}`}</span>
          </div>

          <div className="grid gap-1">
            {[0, 1, 2].map((index) => {
              const predicted = group.predicted[index] ?? null;
              const actual = group.actual[index] ?? null;
              const reason = group.reasons.find((item) => reasonMatchesPosition(item.code, index));
              const points = typeof reason?.points === "number" || typeof reason?.points === "string" ? reason.points : 0;
              const hit = Boolean(reason && Number(points) > 0);
              return (
                <div key={index} className="grid min-h-9 items-center gap-1.5 rounded-md border border-white/10 bg-[#020713]/58 px-1.5 py-1 [grid-template-columns:1.6rem_minmax(0,1fr)_minmax(0,1fr)_2.2rem]">
                  <span className={cn("grid size-6 place-items-center rounded border font-mono text-[0.68rem] font-black", hit ? "border-pitch-green/25 bg-pitch-green/10 text-pitch-green" : "border-white/10 bg-white/[0.055] text-white/42")}>{index + 1}</span>
                  <TeamMini team={predicted} label="Pick" />
                  <TeamMini team={actual} label="Actual" muted={!group.released} />
                  <span className={cn("text-right font-mono text-xs font-black", hit ? "text-[#d8b157]" : "text-white/30")}>+{points}</span>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function Top8AuditTab({ top8 }: { top8: PublicBracketAudit["top8"] }) {
  return (
    <div className="grid max-h-[318px] min-h-[318px] content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 md:max-h-[338px] md:min-h-[338px]">
      {top8.picks.length > 0 ? (
        top8.picks.map((pick) => {
          const pointsLabel = top8.scoreReleased ? `+${Math.max(0, pick.points ?? 0)}` : "--";
          return (
            <div key={`${pick.group ?? "x"}-${pick.team.id}`} className={cn("grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2 py-1.5", pick.correct === true ? "border-pitch-green/22 bg-pitch-green/10" : "border-white/10 bg-[#071126]/68")}>
              <TeamFlag team={pick.team} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-white">{pick.team.name}</span>
                <span className="block truncate text-[0.62rem] font-bold text-white/42" title={pick.savedAt ? `Saved ${formatEasternDateTime(pick.savedAt)}` : "No saved timestamp"}>
                  {pick.group ? `Group ${pick.group}` : "Group pending"} {pick.savedAt ? `/ Saved ${formatEasternDateTime(pick.savedAt)}` : "/ Not saved"}
                </span>
                {pick.source ? <SourcePill source={pick.source} compact /> : null}
              </span>
              <span className="grid justify-items-end gap-0.5">
                <span className={cn("font-mono text-sm font-black", pick.correct === true ? "text-[#d8b157]" : "text-white/34")}>{pointsLabel}</span>
                <span className={cn("grid size-6 place-items-center rounded-full border", pick.correct === true ? "border-pitch-green/25 bg-pitch-green/10 text-pitch-green" : pick.correct === false ? "border-white/10 bg-white/[0.055] text-white/34" : "border-[#d8b157]/24 bg-[#d8b157]/10 text-[#d8b157]")}>
                  {pick.correct === true ? <Check className="size-3.5" /> : pick.correct === false ? <Info className="size-3.5" /> : <Clock3 className="size-3.5" />}
                </span>
              </span>
            </div>
          );
        })
      ) : (
        <p className="rounded-lg border border-white/10 bg-[#071126]/68 p-3 text-sm font-semibold text-white/46">No saved Top 8 picks found for this player.</p>
      )}
    </div>
  );
}

function SourcePill({ source, compact = false }: { source: DefaultPickSource; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 font-black uppercase tracking-[0.08em]",
        compact ? "mt-0.5 text-[0.5rem]" : "text-[0.54rem]",
        source.kind === "autosaved"
          ? "border-electric/24 bg-electric/10 text-electric"
          : "border-[#d8b157]/28 bg-[#d8b157]/10 text-[#d8b157]",
      )}
      title={source.explanation}
    >
      {source.label}
    </span>
  );
}

function PathAuditTab({ audit, summary }: { audit: PublicBracketAudit; summary: ProfileBracketSummary | null }) {
  if (audit.pathHiddenUntilReveal) {
    return (
      <div className="rounded-lg border border-[#d8b157]/24 bg-[#d8b157]/10 p-4">
        <Lock className="mb-3 size-8 text-[#d8b157]" />
        <p className="text-sm font-black text-white">Bracket path hidden</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/54">Round of 32 through final stays stripped server-side until {formatEasternDateTime(audit.bracketRevealAt)}.</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#071126]/68 p-4">
        <Trophy className="mb-3 size-8 text-[#d8b157]" />
        <p className="text-sm font-black text-white">{audit.hasSavedPath ? "Path reveal window open" : "No saved path found"}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/46">This player has no public bracket path details available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5 rounded-lg border border-white/10 bg-[#071126]/68 p-2">
      <div className="rounded-lg border border-[#d8b157]/24 bg-[#d8b157]/10 px-2.5 py-2">
        <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#d8b157]">Champion pick</p>
        <p className="mt-1 truncate text-xl font-black leading-none text-white">{summary.champion?.name ?? "Pending"}</p>
        <p className="mt-1 text-[0.62rem] font-bold text-white/42">Saved {summary.savedAt ? formatEasternDate(summary.savedAt) : "date pending"}</p>
      </div>
      <PathStrip title="Finalists" teams={summary.finalists} />
      <PathStrip title="Semi-finalists" teams={summary.semiFinalists} limit={4} />
      <PathStrip title="Top 8 thirds" teams={summary.topThirds} limit={8} columns={4} />
    </div>
  );
}

function PathStrip({ title, teams, limit = 2, columns = 2 }: { title: string; teams: ProfileBracketSummary["finalists"]; limit?: number; columns?: 2 | 4 }) {
  const visible = teams.slice(0, limit);
  return (
    <div className="rounded-lg border border-white/10 bg-[#020713]/58 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/40">{title}</p>
        <span className="font-mono text-[0.62rem] font-black text-white/36">{teams.length}</span>
      </div>
      {visible.length > 0 ? (
        <div className={columns === 4 ? "grid grid-cols-4 gap-0.5" : "grid grid-cols-2 gap-0.5"}>
          {visible.map((team) => (
            <span key={team.id} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-white/10 bg-[#071126]/64 px-1 py-0 text-[0.54rem] font-black leading-4 text-white">
              <span className="shrink-0 text-[#d8b157]">{team.code ?? "--"}</span>
              <span className="truncate">{team.name}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs font-semibold text-white/36">None</p>
      )}
    </div>
  );
}

function TeamMini({ team, label, muted = false }: { team: PublicAuditTeam | null; label: string; muted?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", muted && "opacity-55")}>
      <TeamFlag team={team} />
      <span className="min-w-0">
        <span className="block truncate text-[0.48rem] font-black uppercase tracking-[0.08em] text-white/34">{label}</span>
        <span className="block truncate text-[0.66rem] font-black text-white">{team?.code ?? "--"}</span>
      </span>
    </span>
  );
}

function TeamFlag({ team }: { team: PublicAuditTeam | null }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.055]">
      {team?.flagPath ? <img src={team.flagPath} alt="" className="h-full w-full object-cover" /> : <span className="text-[0.56rem] font-black text-white/42">{team?.code ?? "--"}</span>}
    </span>
  );
}

function reasonMatchesPosition(code: string | undefined, index: number) {
  if (!code) return false;
  if (index === 0) return code.includes("first");
  if (index === 1) return code.includes("second");
  return code.includes("third");
}
