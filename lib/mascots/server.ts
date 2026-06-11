import "server-only";
import { mascotIds, type MascotId } from "@/lib/mascots/mascotCatalog";
import { resolveMascotLockerDisplayState } from "@/lib/mascots/lockerState";
import { calculateCorrectOutcomeStreaks, type MascotStreakInput } from "@/lib/mascots/streaks";
import { isWorldCupFinalWeek, nextMascotMilestone } from "@/lib/mascots/unlocks";
import { hasFullCosmeticAccess } from "@/lib/profile/cosmeticAccess";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type MascotStateRow = {
  user_id: string;
  starter_mascot: string | null;
  selected_mascot: string | null;
  unlocked_mascots: string[] | null;
  best_correct_streak: number | null;
  current_correct_streak: number | null;
  last_week_unlock: boolean | null;
};

type FinishedMatchRow = {
  id: number;
  kickoff_at: string;
  home_score: number;
  away_score: number;
};

type PredictionRow = {
  match_id: number;
  home_score: number;
  away_score: number;
};

export type MascotLockerData = {
  hasStarter: boolean;
  starterMascot: MascotId | null;
  selectedMascot: MascotId;
  unlockedMascots: MascotId[];
  lockedMascots: MascotId[];
  selectableMascots: MascotId[];
  cosmeticPoints: number;
  bestCorrectStreak: number;
  currentCorrectStreak: number;
  nextMilestone: number | null;
  finalWeekUnlock: boolean;
  finalMatchKickoffAt: string | null;
};

function sanitizeStreak(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export async function getFinalMatchKickoffAt(supabase: AdminClient = createAdminClient()) {
  const { data, error } = await supabase
    .from("matches")
    .select("kickoff_at")
    .not("kickoff_at", "is", null)
    .order("kickoff_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.kickoff_at === "string" ? data.kickoff_at : null;
}

export async function getUserCosmeticPoints(userId: string, supabase: AdminClient = createAdminClient()) {
  const { data: stats } = await supabase.from("user_stats_cache").select("total_points").eq("user_id", userId).maybeSingle();
  if (typeof stats?.total_points === "number") return Math.max(0, Math.floor(stats.total_points));

  const { data: leaderboard } = await supabase.from("leaderboard_cache").select("total_points").eq("user_id", userId).maybeSingle();
  return typeof leaderboard?.total_points === "number" ? Math.max(0, Math.floor(leaderboard.total_points)) : 0;
}

export async function getUserMascotStreaks(userId: string, supabase: AdminClient = createAdminClient()) {
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id,kickoff_at,home_score,away_score")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("kickoff_at", { ascending: true })
    .limit(150);

  if (matchesError) throw new Error(matchesError.message);

  const finishedMatches = (matches ?? []) as FinishedMatchRow[];
  const finishedById = new Map(finishedMatches.map((match) => [Number(match.id), match]));
  const matchIds = finishedMatches.map((match) => Number(match.id));

  if (matchIds.length === 0) return { currentCorrectStreak: 0, bestCorrectStreak: 0 };

  const { data: predictions, error: predictionsError } = await supabase
    .from("match_predictions")
    .select("match_id,home_score,away_score")
    .eq("user_id", userId)
    .in("match_id", matchIds);

  if (predictionsError) throw new Error(predictionsError.message);

  const inputs = ((predictions ?? []) as PredictionRow[]).flatMap<MascotStreakInput>((prediction) => {
    const match = finishedById.get(Number(prediction.match_id));
    if (!match) return [];

    return [
      {
        matchId: Number(match.id),
        kickoffAt: String(match.kickoff_at),
        predictedHomeScore: Number(prediction.home_score),
        predictedAwayScore: Number(prediction.away_score),
        actualHomeScore: Number(match.home_score),
        actualAwayScore: Number(match.away_score),
      },
    ];
  });

  return calculateCorrectOutcomeStreaks(inputs);
}

export async function getMascotLockerData(userId: string, email?: string | null): Promise<MascotLockerData> {
  const supabase = createAdminClient();
  const [{ data: row, error }, finalMatchKickoffAt, cosmeticPoints] = await Promise.all([
    supabase.from("user_mascots").select("*").eq("user_id", userId).maybeSingle(),
    getFinalMatchKickoffAt(supabase),
    getUserCosmeticPoints(userId, supabase),
  ]);

  if (error) throw new Error(error.message);

  const mascotState = row as MascotStateRow | null;
  const finalWeekUnlock = isWorldCupFinalWeek(new Date(), finalMatchKickoffAt);
  const fullCosmeticAccess = hasFullCosmeticAccess(email);

  if (!mascotState) {
    return {
      hasStarter: fullCosmeticAccess,
      starterMascot: null,
      selectedMascot: "maple",
      unlockedMascots: fullCosmeticAccess ? [...mascotIds] : [],
      lockedMascots: [],
      selectableMascots: [...mascotIds],
      cosmeticPoints,
      bestCorrectStreak: 0,
      currentCorrectStreak: 0,
      nextMilestone: fullCosmeticAccess ? null : nextMascotMilestone(cosmeticPoints, finalWeekUnlock),
      finalWeekUnlock,
      finalMatchKickoffAt,
    };
  }

  const bestCorrectStreak = sanitizeStreak(mascotState.best_correct_streak);
  const currentCorrectStreak = sanitizeStreak(mascotState.current_correct_streak);
  const { starterMascot, selectedMascot, unlockedMascots } = resolveMascotLockerDisplayState({
    starterMascot: mascotState.starter_mascot,
    selectedMascot: mascotState.selected_mascot,
    storedUnlockedMascots: mascotState.unlocked_mascots,
    bestCorrectStreak,
    cosmeticPoints,
    finalWeekUnlock,
    fullCosmeticAccess,
  });

  return {
    hasStarter: true,
    starterMascot,
    selectedMascot,
    unlockedMascots,
    lockedMascots: mascotIds.filter((id) => !unlockedMascots.includes(id)),
    selectableMascots: unlockedMascots,
    cosmeticPoints,
    bestCorrectStreak,
    currentCorrectStreak,
    nextMilestone: fullCosmeticAccess ? null : nextMascotMilestone(cosmeticPoints, finalWeekUnlock),
    finalWeekUnlock,
    finalMatchKickoffAt,
  };
}
