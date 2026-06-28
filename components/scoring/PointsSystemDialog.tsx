"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Clock, Info, Lock, Save, ShieldCheck, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MATCH_SCORING_RULES } from "@/lib/scoring/pointsSystem";
import { cn } from "@/lib/utils";

const timingRows = [
  ["7 days or more before kickoff", "1.35x", "Best daily-pick timing reward."],
  ["48 hours to 7 days before kickoff", "1.20x", "Strong early-pick reward."],
  ["12 to 48 hours before kickoff", "1.10x", "Normal early window."],
  ["2 to 12 hours before kickoff", "1.00x", "Full base points."],
  ["30 minutes to 2 hours before kickoff", "0.80x", "Late, but still eligible."],
  ["0 to 30 minutes before kickoff", "0.60x", "Last-minute eligible pick."],
  ["At or after kickoff", "0x", "Locked and ineligible for new points."],
] as const;

const knockoutTimingRows = [
  ["48 hours or more before kickoff", "1.35x", "Best knockout fixture timing reward."],
  ["24 to 48 hours before kickoff", "1.20x", "Strong early-pick reward."],
  ["12 to 24 hours before kickoff", "1.10x", "Normal early knockout window."],
  ["2 to 12 hours before kickoff", "1.00x", "Full base points."],
  ["30 minutes to 2 hours before kickoff", "0.80x", "Late, but still eligible."],
  ["0 to 30 minutes before kickoff", "0.60x", "Last-minute eligible pick."],
  ["At or after kickoff", "0x", "Locked and ineligible for new points."],
] as const;

type TimingStageId = "group" | "round32" | "round16" | "quarter" | "semi" | "finals";

const timingStageRows: Array<{
  id: TimingStageId;
  label: string;
  eyebrow: string;
  title: string;
  maxExact: string;
  stageMultiplier: string;
  rows: typeof timingRows | typeof knockoutTimingRows;
}> = [
  {
    id: "group",
    label: "Group",
    eyebrow: "Original daily timing",
    title: "Group-stage picks keep the 7-day ceiling.",
    maxExact: "18 pts",
    stageMultiplier: "1.00x",
    rows: timingRows,
  },
  {
    id: "round32",
    label: "Round of 32",
    eyebrow: "Compressed knockout timing",
    title: "Round of 32 maxes out at 48 hours.",
    maxExact: "20 pts",
    stageMultiplier: "1.10x",
    rows: knockoutTimingRows,
  },
  {
    id: "round16",
    label: "Round of 16",
    eyebrow: "Compressed knockout timing",
    title: "Round of 16 uses the same fair 48-hour window.",
    maxExact: "20 pts",
    stageMultiplier: "1.10x",
    rows: knockoutTimingRows,
  },
  {
    id: "quarter",
    label: "Quarter-finals",
    eyebrow: "Higher stage value",
    title: "Quarter-finals reward the same timing with a bigger stage lift.",
    maxExact: "22 pts",
    stageMultiplier: "1.20x",
    rows: knockoutTimingRows,
  },
  {
    id: "semi",
    label: "Semi-finals",
    eyebrow: "Higher stage value",
    title: "Semi-finals stay fair without needing a 7-day runway.",
    maxExact: "22 pts",
    stageMultiplier: "1.20x",
    rows: knockoutTimingRows,
  },
  {
    id: "finals",
    label: "Finals",
    eyebrow: "Highest fixture ceiling",
    title: "Third-place and final picks keep the highest ceiling.",
    maxExact: "23 pts",
    stageMultiplier: "1.25x",
    rows: knockoutTimingRows,
  },
];

const stageRows = [
  ["Group stage", "1.00x", "Baseline."],
  ["Round of 32 / Round of 16", "1.10x", "Knockout picks carry higher impact."],
  ["Quarter-finals / Semi-finals", "1.20x", "Late tournament rounds matter more."],
  ["Third-place match / Final", "1.25x", "Highest stage multiplier."],
] as const;

const groupTimelineRows = [
  ["A", "Thu, Jun 11, 2026, 3:00 PM EDT", "2026-06-11 19:00 UTC", "4 / 3 / 2", "First drop", "Mexico vs South Africa"],
  ["A", "Thu, Jun 11, 2026, 10:00 PM EDT", "2026-06-12 02:00 UTC", "3 / 2 / 1", "Second drop", "Korea Republic vs Czechia"],
  ["A", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["B", "Fri, Jun 12, 2026, 3:00 PM EDT", "2026-06-12 19:00 UTC", "4 / 3 / 2", "First drop", "Canada vs Bosnia & Herzegovina"],
  ["B", "Sat, Jun 13, 2026, 3:00 PM EDT", "2026-06-13 19:00 UTC", "3 / 2 / 1", "Second drop", "Qatar vs Switzerland"],
  ["B", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["C", "Sat, Jun 13, 2026, 6:00 PM EDT", "2026-06-13 22:00 UTC", "4 / 3 / 2", "First drop", "Brazil vs Morocco"],
  ["C", "Sat, Jun 13, 2026, 9:00 PM EDT", "2026-06-14 01:00 UTC", "3 / 2 / 1", "Second drop", "Haiti vs Scotland"],
  ["C", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["D", "Fri, Jun 12, 2026, 9:00 PM EDT", "2026-06-13 01:00 UTC", "4 / 3 / 2", "First drop", "USA vs Paraguay"],
  ["D", "Sun, Jun 14, 2026, 12:00 AM EDT", "2026-06-14 04:00 UTC", "3 / 2 / 1", "Second drop", "Australia vs Turkiye"],
  ["D", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["E", "Sun, Jun 14, 2026, 1:00 PM EDT", "2026-06-14 17:00 UTC", "4 / 3 / 2", "First drop", "Germany vs Curacao"],
  ["E", "Sun, Jun 14, 2026, 7:00 PM EDT", "2026-06-14 23:00 UTC", "3 / 2 / 1", "Second drop", "Cote d'Ivoire vs Ecuador"],
  ["E", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["F", "Sun, Jun 14, 2026, 4:00 PM EDT", "2026-06-14 20:00 UTC", "4 / 3 / 2", "First drop", "Netherlands vs Japan"],
  ["F", "Sun, Jun 14, 2026, 10:00 PM EDT", "2026-06-15 02:00 UTC", "3 / 2 / 1", "Second drop", "Sweden vs Tunisia"],
  ["F", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["G", "Mon, Jun 15, 2026, 3:00 PM EDT", "2026-06-15 19:00 UTC", "4 / 3 / 2", "First drop", "Belgium vs Egypt"],
  ["G", "Mon, Jun 15, 2026, 9:00 PM EDT", "2026-06-16 01:00 UTC", "3 / 2 / 1", "Second drop", "IR Iran vs New Zealand"],
  ["G", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["H", "Mon, Jun 15, 2026, 12:00 PM EDT", "2026-06-15 16:00 UTC", "4 / 3 / 2", "First drop", "Spain vs Cabo Verde"],
  ["H", "Mon, Jun 15, 2026, 6:00 PM EDT", "2026-06-15 22:00 UTC", "3 / 2 / 1", "Second drop", "Saudi Arabia vs Uruguay"],
  ["H", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["I", "Tue, Jun 16, 2026, 3:00 PM EDT", "2026-06-16 19:00 UTC", "4 / 3 / 2", "First drop", "France vs Senegal"],
  ["I", "Tue, Jun 16, 2026, 6:00 PM EDT", "2026-06-16 22:00 UTC", "3 / 2 / 1", "Second drop", "Iraq vs Norway"],
  ["I", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["J", "Tue, Jun 16, 2026, 9:00 PM EDT", "2026-06-17 01:00 UTC", "4 / 3 / 2", "First drop", "Argentina vs Algeria"],
  ["J", "Wed, Jun 17, 2026, 12:00 AM EDT", "2026-06-17 04:00 UTC", "3 / 2 / 1", "Second drop", "Austria vs Jordan"],
  ["J", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["K", "Wed, Jun 17, 2026, 1:00 PM EDT", "2026-06-17 17:00 UTC", "4 / 3 / 2", "First drop", "Portugal vs Congo DR"],
  ["K", "Wed, Jun 17, 2026, 10:00 PM EDT", "2026-06-18 02:00 UTC", "3 / 2 / 1", "Second drop", "Uzbekistan vs Colombia"],
  ["K", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
  ["L", "Wed, Jun 17, 2026, 4:00 PM EDT", "2026-06-17 20:00 UTC", "4 / 3 / 2", "First drop", "England vs Croatia"],
  ["L", "Wed, Jun 17, 2026, 7:00 PM EDT", "2026-06-17 23:00 UTC", "3 / 2 / 1", "Second drop", "Ghana vs Panama"],
  ["L", "Thu, Jun 18, 2026, 10:00 AM EDT", "2026-06-18 14:00 UTC", "0 / 0 / 0", "Group segment closes", "Global group cutoff"],
] as const;

const bracketProgressionRows = [
  ["Round of 32 winner", "+4 each", "That exact R32 match must be saved before its kickoff."],
  ["Round of 16 winner", "+8 each", "Full value before either feeder R32 match is known."],
  ["Quarter-final winner", "+14 each", "Value drops only as that branch becomes known."],
  ["Semi-final winner", "+25 each", "Hard early picks stay heavily rewarded."],
  ["Champion", "+60", "Correct tournament winner."],
  ["Third-place winner", "+26", "Correct third-place match winner."],
  ["Perfect R32 bonus", "+30", "Only for all 16 R32 winners saved before kickoff."],
] as const;

const bracketExamples = [
  ["R16 slot before both feeder games", "8 pts", "4 possible teams are still alive."],
  ["R16 slot after one feeder game starts", "6 pts", "3 possible teams remain in that branch."],
  ["R16 slot after both feeder games start", "4 pts", "The matchup is now close to a direct 50/50."],
  ["Champion before any R32 kickoff", "60 pts", "Full blind champion value."],
  ["Champion after half the R32 games start", "45 pts", "About 24 of the original 32 candidates remain unknown."],
] as const;

const top8TimingRows = [
  ["Thu Jun 18, 10:00 AM ET", "+9", "Top 8 opens."],
  ["Sat Jun 20, 10:00 AM ET", "+8", "Still rewarded for early confidence."],
  ["Mon Jun 22, 10:00 AM ET", "+6", "More group results are known."],
  ["Tue Jun 23, 10:00 AM ET", "+4", "Late, but still meaningful."],
  ["Wed Jun 24 before 3:00 PM ET", "+3", "Final hours before lock."],
  ["Wed Jun 24, 3:00 PM ET", "0", "Global Top 8 scoring lock."],
] as const;

export function PointsSystemDialog({ compact = false }: { compact?: boolean }) {
  const [timingStageId, setTimingStageId] = useState<TimingStageId>("group");
  const activeTimingStage = timingStageRows.find((stage) => stage.id === timingStageId) ?? timingStageRows[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="points-guide-trigger min-h-11 border-white/10 bg-white/[0.065] font-black hover:bg-white/[0.095]"
        >
          <Info className="size-4" />
          Points guide
        </Button>
      </DialogTrigger>
      <DialogContent
        className="wc-kit-dialog points-dialog max-h-[88dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-electric/20 bg-[#050914]/95 p-0 shadow-[0_28px_90px_rgba(0,0,0,0.62)] supports-backdrop-filter:backdrop-blur-xl sm:max-w-5xl"
        aria-describedby="match-points-guide-description"
      >
        <GuideFrame
          eyebrow="Fixture picks"
          title="Pick Points"
          description="Score picks lock at kickoff. Exact scores, early saves, and later knockout stages have the highest ceiling."
          icon={<Target className="size-7 text-trophy-gold" />}
          descriptionId="match-points-guide-description"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(300px,0.58fr)]">
            <section className="rounded-2xl border border-trophy-gold/25 bg-trophy-gold/[0.075] p-4">
              <p className="wc-label text-trophy-gold">Base score formula</p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-foreground">A perfect group-stage score can reach 18 points.</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                The maximum base score is 14 points, then timing and stage multipliers are applied with integer floor rounding.
              </p>
              <div className="mt-4 grid gap-2">
                {MATCH_SCORING_RULES.map((rule) => (
                  <GuideRow key={rule.code} label={rule.label} value={`+${rule.points}`} detail={rule.description} tone={rule.tone} />
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-navy-950/55 p-3 text-sm font-semibold leading-6 text-muted-foreground">
                Wrong outcome or wrong knockout advancer scores 0 for that match. There is no negative scoring.
              </div>
            </section>

            <div className="grid gap-3">
              <GuideMetric icon={<Trophy className="size-5" />} label="Exact group score" value="up to 18 pts" detail="14 base points at the best 1.35x timing multiplier." />
              <GuideMetric icon={<Trophy className="size-5" />} label="Exact final score" value="up to 23 pts" detail="14 base x 1.35 timing x 1.25 final-stage multiplier." />
              <GuideMetric icon={<Lock className="size-5" />} label="Privacy lock" value="hidden until kickoff" detail="Other users cannot see a saved score pick before that fixture locks." />
            </div>
          </div>

          <section className="rounded-2xl border border-electric/20 bg-electric/[0.055] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="wc-label text-electric">Timing multipliers</p>
                <h3 className="mt-2 text-2xl font-black leading-tight text-foreground">Stage tabs make timing easier to audit.</h3>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-trophy-gold/24 bg-trophy-gold/10 px-3 py-2 text-xs font-black text-trophy-gold">
                <Clock className="size-4" />
                Knockouts max at 48h
              </span>
            </div>

            <div className="mt-4 min-w-0">
              <div role="tablist" aria-label="Pick timing stage tabs" className="grid w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.045] p-1 sm:grid-cols-3 xl:grid-cols-6">
                {timingStageRows.map((stage) => {
                  const active = stage.id === timingStageId;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTimingStageId(stage.id)}
                      className={cn(
                        "min-h-12 rounded-lg border border-transparent px-2 py-2 text-center text-[0.72rem] font-black leading-tight text-muted-foreground transition hover:border-white/18 hover:bg-white/[0.075] hover:text-white active:scale-[0.98]",
                        active && "border-trophy-gold/35 bg-trophy-gold text-[#11131c] hover:border-trophy-gold/35 hover:bg-trophy-gold hover:text-[#11131c]",
                      )}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>

              <div role="tabpanel" className="mt-4">
                <TimingStagePanel stage={activeTimingStage} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="wc-label">Stage multipliers</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {stageRows.map(([label, value, detail]) => (
                <GuideRow key={label} label={label} value={value} detail={detail} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-pitch-green/25 bg-pitch-green/[0.055] p-4">
            <p className="wc-label text-pitch-green">Fairness notes</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-muted-foreground">
              <li>Picks can be updated or cancelled until that fixture kicks off.</li>
              <li>The app stores the latest meaningful edit time. Re-saving the same score does not reset that timestamp.</li>
              <li>Unlocking or deleting a pick removes the saved timestamp, so saving again later can reduce timing points.</li>
              <li>If a match is awarded, only the correct outcome or advancer portion is scored.</li>
            </ul>
          </section>
        </GuideFrame>
      </DialogContent>
    </Dialog>
  );
}

function TimingStagePanel({ stage }: { stage: (typeof timingStageRows)[number] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-trophy-gold/24 bg-trophy-gold/10 p-4">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-trophy-gold">{stage.eyebrow}</p>
        <h4 className="mt-2 text-xl font-black leading-tight text-white">{stage.title}</h4>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <TimingMiniStat label="Max exact" value={stage.maxExact} />
          <TimingMiniStat label="Stage" value={stage.stageMultiplier} />
        </div>
      </aside>

      <div className="grid min-w-0 gap-2">
        {stage.rows.map(([label, value, detail]) => (
          <GuideRow key={label} label={label} value={value} detail={detail} tone="blue" />
        ))}
      </div>
    </div>
  );
}

function TimingMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#071126]/70 p-3 text-center">
      <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-black text-trophy-gold">{value}</p>
    </div>
  );
}

export function BracketPointsGuideDialog({ compact = false }: { compact?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="points-guide-trigger min-h-11 border-white/10 bg-white/[0.065] font-black hover:bg-white/[0.095]"
        >
          <Info className="size-4" />
          Bracket guide
        </Button>
      </DialogTrigger>
      <DialogContent
        className="wc-kit-dialog points-dialog max-h-[88dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-electric/20 bg-[#050914]/95 p-0 shadow-[0_28px_90px_rgba(0,0,0,0.62)] supports-backdrop-filter:backdrop-blur-xl sm:max-w-6xl"
        aria-describedby="bracket-points-guide-description"
      >
        <GuideFrame
          eyebrow="Tournament path"
          title="Bracket Guide"
          description="Groups, Top 8 thirds, and knockout picks each have their own save window, lock behavior, and scoring rules."
          icon={<Trophy className="size-7 text-trophy-gold" />}
          descriptionId="bracket-points-guide-description"
        >
          <Tabs defaultValue="groups" className="min-h-0">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-1">
              <TabsTrigger value="groups" className="min-h-11 rounded-lg text-xs font-black data-active:bg-electric data-active:text-white sm:text-sm">
                Groups
              </TabsTrigger>
              <TabsTrigger value="top8" className="min-h-11 rounded-lg text-xs font-black data-active:bg-electric data-active:text-white sm:text-sm">
                Top 8
              </TabsTrigger>
              <TabsTrigger value="logic" className="min-h-11 rounded-lg text-xs font-black data-active:bg-electric data-active:text-white sm:text-sm">
                Bracket Logic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-4 min-h-0">
              <GroupDropsTab />
            </TabsContent>

            <TabsContent value="top8" className="mt-4 min-h-0">
              <Top8RulesTab />
            </TabsContent>

            <TabsContent value="logic" className="mt-4 min-h-0">
              <BracketLogicTab />
            </TabsContent>
          </Tabs>
        </GuideFrame>
      </DialogContent>
    </Dialog>
  );
}

function BracketLogicTab() {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 lg:grid-cols-3">
        <GuideMetric
          icon={<Trophy className="size-5" />}
          label="Full blind max"
          value="350 pts"
          detail="Perfect bracket path from R32 through champion, including the perfect R32 bonus."
        />
        <GuideMetric
          icon={<Lock className="size-5" />}
          label="R32 locks"
          value="one match at a time"
          detail="Each Round of 32 match locks at its own kickoff. Other future R32 matches keep full value."
        />
        <GuideMetric
          icon={<ShieldCheck className="size-5" />}
          label="Late fairness"
          value="branch adjusted"
          detail="Later-round values drop only when teams in that exact branch become known."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <p className="wc-label">Knockout save flow</p>
        <div className="mt-3 grid gap-3">
          <GuideStep number="1" title="Build and save the full path">
            Pick Match 73 through Match 104. The final bracket save is required before the app can score changed knockout picks.
          </GuideStep>
          <GuideStep number="2" title="R32 locks individually">
            When a Round of 32 match kicks off, that exact pick locks. If it was not saved before kickoff, that R32 slot scores 0.
          </GuideStep>
          <GuideStep number="3" title="Finished R32 winners can move forward">
            If a user missed an R32 pick, the real winner can still become a later-round candidate after the result, but later points are reduced because more information is known.
          </GuideStep>
          <GuideStep number="4" title="Final R32 kickoff closes the bracket">
            After the final Round of 32 match kicks off, no new knockout bracket saves score. Existing valid timestamps remain.
          </GuideStep>
        </div>
      </section>

      <section className="rounded-2xl border border-trophy-gold/25 bg-trophy-gold/[0.07] p-4">
        <p className="wc-label text-trophy-gold">Knockout progression points</p>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {bracketProgressionRows.map(([label, value, detail]) => (
            <GuideRow key={label} label={label} value={value} detail={detail} />
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
          Later-round points use: floor(full value x possible teams still unknown / original possible teams). This rewards early work without letting late information become free points.
        </p>
      </section>

      <section className="rounded-2xl border border-electric/20 bg-electric/[0.055] p-4">
        <p className="wc-label text-electric">Simple examples</p>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {bracketExamples.map(([label, value, detail]) => (
            <GuideRow key={label} label={label} value={value} detail={detail} tone="blue" />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-pitch-green/25 bg-pitch-green/[0.055] p-4">
        <p className="wc-label text-electric">Save behavior</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <GuideMetric icon={<Save className="size-5" />} label="Save groups" value="not automatic" detail="Moving teams changes the draft until Save groups succeeds." />
          <GuideMetric icon={<Save className="size-5" />} label="Save Top 8" value="not automatic" detail="Selecting Top 8 teams changes the draft until Save Top 8 succeeds." />
          <GuideMetric icon={<Save className="size-5" />} label="Save bracket" value="required" detail="Clicking winners changes the draft until Save final bracket succeeds." />
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
          Locked segments preserve older valid saved picks. Public finalized paths stay hidden until the bracket reveal deadline.
        </p>
      </section>
    </div>
  );
}

function Top8RulesTab() {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 lg:grid-cols-3">
        <GuideMetric icon={<ShieldCheck className="size-5" />} label="Correct team" value="+9 to +3 each" detail="Each correct selected team uses that team's own saved timestamp." />
        <GuideMetric icon={<Trophy className="size-5" />} label="Perfect bonus" value="+10" detail="Only for 8 out of 8 correct Top 8 teams." />
        <GuideMetric icon={<Lock className="size-5" />} label="Global lock" value="Jun 24, 3 PM ET" detail="At or after lock, new Top 8 saves are ineligible." />
      </section>

      <section className="rounded-2xl border border-pitch-green/25 bg-pitch-green/[0.055] p-4">
        <p className="wc-label text-pitch-green">Top 8 point windows</p>
        <h3 className="mt-1 text-2xl font-black text-foreground">Earlier saves are worth more per correct team.</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          Pick exactly eight third-place teams, with at most one from each group. They score only if they finish third and qualify for the Round of 32.
        </p>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {top8TimingRows.map(([label, value, detail]) => (
            <GuideRow key={label} label={label} value={value} detail={detail} tone="green" />
          ))}
        </div>
        <p className="mt-3 rounded-lg border border-trophy-gold/20 bg-trophy-gold/10 px-3 py-2 text-sm font-black text-trophy-gold">
          Perfect 8/8 adds +10.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <p className="wc-label">Save behavior</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <GuideMetric icon={<Save className="size-5" />} label="Per-group timestamp" value="shown beside pick" detail="Saving Group A Top 8 stamps only that group. Other saved groups keep their original time." />
          <GuideMetric icon={<CalendarClock className="size-5" />} label="Audit later" value="team by team" detail="The audit shows saved time, correctness, and points beside every selected country." />
        </div>
      </section>
    </div>
  );
}

function GroupDropsTab() {
  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-trophy-gold/25 bg-trophy-gold/[0.07] p-4">
        <p className="wc-label text-trophy-gold">Point value reference</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <GuideMetric icon={<Clock className="size-5" />} label="Before first kickoff" value="6 / 4 / 3" detail="Best value for correct 1st, 2nd, and 3rd." />
          <GuideMetric icon={<Clock className="size-5" />} label="At first kickoff" value="4 / 3 / 2" detail="The first lower value applies at the exact listed kickoff." />
          <GuideMetric icon={<Clock className="size-5" />} label="At second kickoff" value="3 / 2 / 1" detail="The second lower value applies at the exact listed kickoff." />
          <GuideMetric icon={<Lock className="size-5" />} label="Group cutoff" value="0 / 0 / 0" detail="New or late group saves no longer score. Existing valid saves remain." />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="wc-label">All group point changes</p>
            <h3 className="mt-1 text-2xl font-black text-foreground">Exact Eastern times</h3>
          </div>
          <p className="max-w-xl text-sm font-semibold leading-6 text-muted-foreground">
            Source: synced fixture table, app scoring helpers, and FIFA official match schedule cross-check.
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="hidden rounded-xl border border-white/10 bg-navy-950/70 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:grid lg:grid-cols-[0.38fr_1.45fr_0.72fr_0.75fr_minmax(0,1.25fr)] lg:gap-3">
            <span>Group</span>
            <span>Exact time</span>
            <span>Points after</span>
            <span>Change</span>
            <span>Trigger</span>
          </div>
          {groupTimelineRows.map(([group, time, utc, points, change, trigger], index) => (
            <article
              key={`${group}-${time}-${index}`}
              className="grid gap-2 rounded-xl border border-white/10 bg-navy-950/55 p-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.045)] lg:grid-cols-[0.38fr_1.45fr_0.72fr_0.75fr_minmax(0,1.25fr)] lg:items-center lg:gap-3"
            >
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Group</p>
                <p className="font-mono text-base font-black text-trophy-gold">Group {group}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Exact time</p>
                <p className="break-words font-black text-foreground">{time}</p>
                <p className="mt-0.5 break-words font-mono text-xs font-semibold text-muted-foreground">{utc}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Points after</p>
                <p className="font-mono text-base font-black text-trophy-gold">{points}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Change</p>
                <p className="font-bold text-muted-foreground">{change}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Trigger</p>
                <p className="break-words font-bold text-muted-foreground">{trigger}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-electric/20 bg-electric/[0.055] p-4">
        <p className="wc-label text-electric">Important timing rule</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          At the exact listed instant, the lower value applies. The same global group cutoff is listed for every group because it closes the whole group-ranking segment and opens the next bracket step.
        </p>
      </section>
    </div>
  );
}

function GuideFrame({
  eyebrow,
  title,
  description,
  icon,
  children,
  descriptionId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  descriptionId: string;
}) {
  return (
    <div className="grid max-h-[88dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <DialogHeader className="border-b border-white/10 px-4 py-4 pr-14 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="wc-label text-electric">{eyebrow}</p>
            <DialogTitle className="mt-2 text-[clamp(2rem,5vw,4.35rem)] font-black leading-none tracking-normal text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription id={descriptionId} className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground sm:text-base">
              {description}
            </DialogDescription>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-trophy-gold/25 bg-trophy-gold/10 p-3 sm:grid">{icon}</div>
        </div>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 scrollbar-soft">
        <div className="grid gap-4">{children}</div>
      </div>
    </div>
  );
}

function GuideMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.055)]">
      <div className="mb-3 flex items-center gap-2 text-trophy-gold">
        {icon}
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
      <p className="break-words text-xl font-black leading-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">{detail}</p>
    </article>
  );
}

function GuideRow({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <article className="grid min-w-0 gap-2 rounded-xl border border-white/10 bg-navy-950/55 p-3 sm:grid-cols-[minmax(0,1fr)_7.25rem] sm:items-center">
      <div className="min-w-0">
        <p className="break-words text-sm font-black text-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-muted-foreground">{detail}</p>
      </div>
      <p
        className={cn(
          "rounded-lg border bg-white/[0.045] px-3 py-2 text-center font-mono text-sm font-black text-trophy-gold",
          tone === "green" && "border-pitch-green/25 text-pitch-green",
          tone === "blue" && "border-electric/25 text-electric",
          tone === "gold" && "border-trophy-gold/25 text-trophy-gold",
        )}
      >
        {value}
      </p>
    </article>
  );
}

function GuideStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <article className="grid gap-3 rounded-xl border border-white/10 bg-navy-950/55 p-3 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
      <div className="grid size-11 place-items-center rounded-xl border border-trophy-gold/25 bg-trophy-gold/10 font-mono text-lg font-black text-trophy-gold">{number}</div>
      <div className="min-w-0">
        <h4 className="text-base font-black text-foreground">{title}</h4>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">{children}</p>
      </div>
    </article>
  );
}
