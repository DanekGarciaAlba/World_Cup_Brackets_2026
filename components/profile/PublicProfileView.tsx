import { ArrowLeft, BadgeCheck, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FullPublicProfileCard } from "@/components/profile/FullPublicProfileCard";
import { ProfileKitCard } from "@/components/profile/ProfileKitCard";
import { PublicBracketAuditCard, type PublicBracketAudit } from "@/components/profile/PublicBracketAuditCard";
import { PublicPredictionTimeline } from "@/components/profile/PublicPredictionTimeline";
import { Button } from "@/components/ui/button";
import { findEmoteById, getDefaultEmoteForSkin } from "@/lib/emotes/emoteCatalog";
import { findKitById } from "@/lib/kits/kitCatalog";
import { mascotCatalog, type MascotId } from "@/lib/mascots/mascotCatalog";
import { findSkinById, getDefaultSkinForMascot } from "@/lib/mascots/skinCatalog";
import type { PublicPredictionPreview } from "@/lib/privacy/publicPredictionPreview";
import type { ProfileBracketSummary, ProfileBracketTeam } from "@/lib/profile/bracketSummary";
import { formatEasternDate, formatEasternDateTime } from "@/lib/utils/easternTime";
import { cn } from "@/lib/utils";

type PublicProfileViewProps = {
  profile: {
    displayName: string;
    department: string | null;
    favoriteCountry: string | null;
    subtitle?: string | null;
  };
  avatar: {
    avatarBase: string | null;
    celebrationStyle: string | null;
    badgeShape: string | null;
    kitId: string | null;
  } | null;
  mascot: {
    selectedMascot: MascotId;
    unlockedCount: number;
    currentCorrectStreak: number;
    bestCorrectStreak: number;
  };
  stats: {
    rank: number | null;
    totalPoints: number;
    matchPoints: number;
    groupPoints: number;
    bracketPoints: number;
    bonusPoints: number;
    exactScores: number;
    correctOutcomes: number;
  } | null;
  bracketSummary: ProfileBracketSummary | null;
  bracketAudit?: PublicBracketAudit | null;
  bracketRevealAt?: string | null;
  bracketHiddenUntilReveal?: boolean;
  predictionPreview?: PublicPredictionPreview[];
  profileUserId?: string;
  headerEyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actionHref?: string;
  actionLabel?: string;
};

function formatSavedAt(value: string | null) {
  if (!value) return "Not saved";
  return formatEasternDate(value);
}

function formatRevealAt(value?: string | null) {
  if (!value) return "the deadline";
  return formatEasternDateTime(value);
}

export function PublicProfileView({
  profile,
  avatar,
  mascot,
  stats,
  bracketSummary,
  bracketAudit,
  bracketRevealAt,
  bracketHiddenUntilReveal = false,
  predictionPreview = [],
  profileUserId,
  headerEyebrow = "Public player card",
  backHref = "/leaderboard",
  backLabel = "Leaderboard",
  actionHref,
  actionLabel = "View Picks",
}: PublicProfileViewProps) {
  const selectedMascot = mascotCatalog[mascot.selectedMascot];
  const savedSkin = findSkinById(avatar?.avatarBase);
  const selectedSkin = savedSkin?.mascotId === mascot.selectedMascot ? savedSkin : getDefaultSkinForMascot(mascot.selectedMascot);
  const kit = findKitById(avatar?.kitId ?? "canada");
  const savedEmote = findEmoteById(avatar?.celebrationStyle);
  const emote = savedEmote.skinId === selectedSkin.id ? savedEmote : getDefaultEmoteForSkin(selectedSkin.id);
  const displayName = profile.displayName || "Player";
  const subtitle = profile.subtitle ?? [profile.department, profile.favoriteCountry ?? kit.countryName].filter(Boolean).join(" / ");
  const clubName = profile.department ?? "No club yet";
  const clubSubLabel = profile.favoriteCountry ?? kit.countryName;

  return (
    <div className="public-profile-view-shell mx-auto grid w-full max-w-[1540px] gap-2.5 pb-3 text-white md:gap-3 md:pb-4 xl:grid-rows-[auto_minmax(0,1fr)]">
      <header className="grid gap-2.5 rounded-xl border border-white/10 bg-[#020713]/92 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:gap-3 md:p-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <Button asChild variant="secondary" className="h-10 w-fit rounded-lg border-white/12 bg-white/[0.055] text-white hover:bg-white/[0.09]">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#bcb8ff]">{headerEyebrow}</p>
          <h1 className="truncate text-2xl font-black leading-none text-white md:text-5xl">{displayName}</h1>
          {subtitle ? <p className="mt-2 truncate text-sm font-bold text-white/58">{subtitle}</p> : null}
        </div>
        {actionHref ? (
          <Button asChild className="h-11 rounded-lg">
            <Link href={actionHref}>
              <CalendarDays className="size-4" />
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/70">
            <BadgeCheck className="size-3.5 text-[#d8b157]" />
            {bracketSummary?.complete ? "Bracket finalized" : "Profile"}
          </span>
        )}
      </header>

      <main className="public-profile-view-grid grid h-full min-h-0 gap-2.5 md:gap-3 xl:grid-cols-2">
        <section className="public-profile-left-column grid h-full min-h-0 gap-2.5 md:grid-rows-[auto_minmax(0,1fr)] md:gap-3">
          <section className="public-profile-overview-panel rounded-xl border border-white/10 bg-[#020713]/92 p-2 shadow-[0_0_46px_rgba(216,177,87,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2 md:gap-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#d8b157]">How others see you</p>
              <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/54">
                Public view
              </span>
            </div>
            <div className="public-profile-showcase-pair grid justify-start gap-3">
              <FullPublicProfileCard
                displayName={displayName}
                mascot={selectedMascot}
                skin={selectedSkin}
                emote={emote}
                kit={kit}
                stats={stats}
                variant="compact"
                className="max-w-none"
              />
              <ProfileKitCard kit={kit} className="aspect-square" />
            </div>
          </section>

          {bracketAudit ? <PublicBracketAuditCard audit={bracketAudit} summary={bracketSummary} /> : <ProfileBracketCard summary={bracketSummary} revealAt={bracketRevealAt} hiddenUntilReveal={bracketHiddenUntilReveal} />}
        </section>

        <section className="public-profile-right-column grid h-full min-h-0 gap-2.5 md:grid-rows-[auto_minmax(0,1fr)] md:gap-3">
          <section className="public-profile-click-metrics grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
            <PublicMetricCard iconPath="/assets/profile/stats/rank.png" label="Rank" value={stats?.rank ? `#${stats.rank}` : "--"} detail={stats?.rank ? "Top board" : "Unranked"} />
            <PublicMetricCard iconPath="/assets/profile/stats/points.png" label="Points" value={String(stats?.totalPoints ?? 0)} detail="Total points" />
            <PublicMetricCard iconPath="/assets/profile/stats/correct.png" label="Correct" value={String(stats?.correctOutcomes ?? 0)} detail="Predictions" />
            <PublicMetricCard iconPath="/assets/profile/stats/club.png" label="Club" value={clubName} detail={clubSubLabel} compactText />
          </section>

          <PublicPredictionTimeline predictions={predictionPreview} profileUserId={profileUserId} />
        </section>
      </main>
    </div>
  );
}

function PublicMetricCard({
  iconPath,
  label,
  value,
  detail,
  compactText = false,
}: {
  iconPath: string;
  label: string;
  value: string;
  detail: string;
  compactText?: boolean;
}) {
  return (
    <article className="grid min-h-[94px] min-w-0 content-center justify-items-center rounded-xl border border-white/10 bg-[#071126]/78 p-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:min-h-[132px] md:p-2.5">
      <img src={iconPath} alt="" className="h-7 w-7 object-contain drop-shadow-[0_0_16px_rgba(216,177,87,.35)] md:h-9 md:w-9" />
      <p className="mt-2 text-[0.56rem] font-black uppercase tracking-[0.14em] text-white/48">{label}</p>
      <p className={cn("mt-1 max-w-full truncate font-black leading-none text-white md:mt-1.5", compactText ? "text-sm leading-tight md:text-base" : "text-2xl md:text-3xl")}>{value}</p>
      <p className="mt-1.5 max-w-full truncate text-[0.68rem] font-bold text-white/48 md:mt-2 md:text-xs">{detail}</p>
    </article>
  );
}

function ProfileBracketCard({ summary, revealAt, hiddenUntilReveal }: { summary: ProfileBracketSummary | null; revealAt?: string | null; hiddenUntilReveal?: boolean }) {
  const champion = summary?.champion ?? null;

  return (
    <section className="min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#020713]/92 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/42">Bracket card</p>
          <h2 className="mt-0.5 truncate text-xl font-black leading-none text-white">{hiddenUntilReveal ? "Path locked" : champion ? "Finalized path" : "No final path"}</h2>
        </div>
        <span className="rounded-full border border-[#d8b157]/30 bg-[#d8b157]/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.1em] text-[#d8b157]">
          {hiddenUntilReveal ? "Hidden" : summary?.complete ? "Complete" : `${summary?.pickedMatches ?? 0}/32`}
        </span>
      </div>

      {hiddenUntilReveal ? (
        <EmptyBlock title="Bracket path hidden">
          This saved tournament path appears on the public profile after {formatRevealAt(revealAt)}.
        </EmptyBlock>
      ) : summary ? (
        <div className="grid h-full min-h-0 gap-1">
          <div className="rounded-lg border border-[#d8b157]/24 bg-[#d8b157]/10 px-2.5 py-1.5">
            <div className="flex min-w-0 items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[0.54rem] font-black uppercase tracking-[0.14em] text-[#d8b157]">Champion pick</span>
                <span className="mt-0.5 block truncate text-xl font-black leading-none text-white">{champion?.name ?? "Pending"}</span>
              </span>
              <span className="shrink-0 text-[0.6rem] font-bold text-white/42">Saved {formatSavedAt(summary.savedAt)}</span>
            </div>
          </div>
          <TeamStrip title="Finalists" teams={summary.finalists} />
          <TeamStrip title="Semi-finalists" teams={summary.semiFinalists} limit={4} />
          <TeamStrip title="Quarter-finalists" teams={summary.quarterFinalists} limit={8} columns={4} />
          <TeamStrip title="Third place" teams={summary.thirdPlaceWinner ? [summary.thirdPlaceWinner] : []} />
          <TeamStrip title="Top 8 thirds" teams={summary.topThirds} limit={8} columns={4} />
        </div>
      ) : (
        <EmptyBlock title="Bracket not shared yet">
          This profile will show the finalized tournament path after the bracket builder is completed and saved.
        </EmptyBlock>
      )}
    </section>
  );
}

function EmptyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#071126]/68 p-4">
      <img src="/assets/ui/trophy.png" alt="" className="mb-3 h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(216,177,87,.35)]" />
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{children}</p>
    </div>
  );
}

function TeamStrip({
  title,
  teams,
  limit = 2,
  empty = "None",
  columns = 2,
}: {
  title: string;
  teams: ProfileBracketTeam[];
  limit?: number;
  empty?: string;
  columns?: 2 | 4;
}) {
  const visible = teams.slice(0, limit);
  return (
    <div className="rounded-lg border border-white/10 bg-[#071126]/68 p-1">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <p className="truncate text-[0.54rem] font-black uppercase tracking-[0.12em] text-white/40">{title}</p>
        <span className="font-mono text-[0.62rem] font-black text-white/36">{teams.length}</span>
      </div>
      {visible.length > 0 ? (
        <div className={columns === 4 ? "grid grid-cols-4 gap-0.5" : "grid grid-cols-2 gap-0.5"}>
          {visible.map((team) => (
            <span key={team.id} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-white/10 bg-[#020713]/64 px-1 py-0 text-[0.54rem] font-black leading-4 text-white">
              <span className="shrink-0 text-[#d8b157]">{team.code ?? "--"}</span>
              <span className="truncate">{team.name}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs font-semibold text-white/36">{empty}</p>
      )}
    </div>
  );
}
