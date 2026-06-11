import { notFound } from "next/navigation";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getWorldCupDashboardData, type MatchSummary } from "@/lib/data/worldCupData";
import { getMascotLockerData } from "@/lib/mascots/server";
import { buildPublicPredictionPreview } from "@/lib/privacy/publicPredictionPreview";
import { buildProfileBracketSummary, parseProfileBracketPath } from "@/lib/profile/bracketSummary";
import { deriveWorldCupDeadlines } from "@/lib/scoring/deadlines";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PublicProfilePageProps = {
  params: Promise<{ userId: string }> | { userId: string };
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { userId } = await params;
  const supabase = createAdminClient();
  const dashboardData = await getWorldCupDashboardData();
  const now = new Date();
  const deadlines = deriveWorldCupDeadlines(dashboardData.matches);
  const bracketRevealAt = deadlines.knockoutLockAt;
  const bracketRevealed = now.getTime() >= new Date(bracketRevealAt).getTime();
  const profileMatches = selectPublicProfileMatches(dashboardData.matches);
  const matchIds = profileMatches.map((match) => match.id);

  const [{ data: profile }, { data: avatar }, { data: stats }, mascotLocker, { data: tournamentPath }, { data: bracketTeams }, { data: matchPredictions }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,department,favorite_country").eq("id", userId).maybeSingle(),
    supabase.from("user_avatars").select("avatar_base,celebration_style,badge_shape,kit_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("leaderboard_cache")
      .select("total_points,match_points,group_points,bracket_points,bonus_points,exact_scores,correct_outcomes,current_rank")
      .eq("user_id", userId)
      .maybeSingle(),
    getMascotLockerData(userId),
    supabase.from("tournament_predictions").select("path,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("teams").select("id,name,code,country").limit(500),
    matchIds.length > 0
      ? supabase.from("match_predictions").select("match_id,home_score,away_score,updated_at").eq("user_id", userId).in("match_id", matchIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (!profile) notFound();

  const displayName = typeof profile.display_name === "string" && profile.display_name ? profile.display_name : "Player";
  const rawBracketSummary = buildProfileBracketSummary(
    parseProfileBracketPath(tournamentPath?.path),
    (bracketTeams ?? []).map((team: any) => ({
      id: Number(team.id),
      name: String(team.name ?? "Team pending"),
      code: typeof team.code === "string" ? team.code : null,
      country: typeof team.country === "string" ? team.country : null,
    })),
    typeof tournamentPath?.updated_at === "string" ? tournamentPath.updated_at : null,
  );
  const hasSavedBracketPath = Boolean(tournamentPath?.path);
  const bracketSummary = bracketRevealed ? rawBracketSummary : null;

  return (
    <PublicProfileView
      profile={{
        displayName,
        department: typeof profile.department === "string" ? profile.department : null,
        favoriteCountry: typeof profile.favorite_country === "string" ? profile.favorite_country : null,
      }}
      avatar={{
        avatarBase: typeof avatar?.avatar_base === "string" ? avatar.avatar_base : null,
        celebrationStyle: typeof avatar?.celebration_style === "string" ? avatar.celebration_style : null,
        badgeShape: typeof avatar?.badge_shape === "string" ? avatar.badge_shape : null,
        kitId: typeof avatar?.kit_id === "string" ? avatar.kit_id : null,
      }}
      mascot={{
        selectedMascot: mascotLocker.selectedMascot,
        unlockedCount: mascotLocker.unlockedMascots.length,
        currentCorrectStreak: mascotLocker.currentCorrectStreak,
        bestCorrectStreak: mascotLocker.bestCorrectStreak,
      }}
      stats={
        stats
          ? {
              rank: typeof stats.current_rank === "number" ? stats.current_rank : null,
              totalPoints: Number(stats.total_points ?? 0),
              matchPoints: Number(stats.match_points ?? 0),
              groupPoints: Number(stats.group_points ?? 0),
              bracketPoints: Number(stats.bracket_points ?? 0),
              bonusPoints: Number(stats.bonus_points ?? 0),
              exactScores: Number(stats.exact_scores ?? 0),
              correctOutcomes: Number(stats.correct_outcomes ?? 0),
            }
          : null
      }
      bracketSummary={bracketSummary}
      bracketRevealAt={bracketRevealAt}
      bracketHiddenUntilReveal={!bracketRevealed && hasSavedBracketPath}
      predictionPreview={buildPublicPredictionPreview(profileMatches, matchPredictions ?? [], now)}
    />
  );
}

function selectPublicProfileMatches(matches: MatchSummary[]) {
  return matches
    .filter((match) => match.homeTeam && match.awayTeam)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
}
