import { canRevealPrediction } from "@/lib/utils/locks";

export type PublicPredictionTeam = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  logoUrl?: string | null;
};

export type PublicPredictionPreview = {
  id: number;
  homeTeam: PublicPredictionTeam | null;
  awayTeam: PublicPredictionTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  savedAt: string | null;
  revealAt: string;
  revealed: boolean;
  status: string;
  matchLabel: string;
};

type PublicPredictionMatch = {
  id: number;
  kickoffAt: string;
  status?: string | null;
  groupName?: string | null;
  stage?: string | null;
  round?: string | null;
  homeTeam: PublicPredictionTeam | null;
  awayTeam: PublicPredictionTeam | null;
};

type StoredPrediction = {
  match_id: number | string;
  home_score: number | string | null;
  away_score: number | string | null;
  meaningful_updated_at?: string | null;
  updated_at: string | null;
};

function toScore(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : null;
}

function matchLabel(match: PublicPredictionMatch) {
  return match.groupName ?? match.stage ?? match.round ?? "Fixture";
}

export function buildPublicPredictionPreview(matches: PublicPredictionMatch[], predictions: StoredPrediction[], now = new Date()): PublicPredictionPreview[] {
  const picksByMatchId = new Map(
    predictions.map((prediction) => [
      Number(prediction.match_id),
      {
        homeScore: toScore(prediction.home_score),
        awayScore: toScore(prediction.away_score),
        savedAt:
          typeof prediction.meaningful_updated_at === "string"
            ? prediction.meaningful_updated_at
            : typeof prediction.updated_at === "string"
              ? prediction.updated_at
              : null,
      },
    ]),
  );

  return matches.map((match) => {
    const pick = picksByMatchId.get(match.id);
    const revealed = canRevealPrediction({ kickoff_at: match.kickoffAt }, now);
    return {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: revealed ? pick?.homeScore ?? null : null,
      awayScore: revealed ? pick?.awayScore ?? null : null,
      savedAt: revealed ? pick?.savedAt ?? null : null,
      revealAt: match.kickoffAt,
      revealed,
      status: match.status ?? "scheduled",
      matchLabel: matchLabel(match),
    };
  });
}

export function getPublicPredictionFocusIndex(predictions: PublicPredictionPreview[], now = new Date()) {
  if (predictions.length === 0) return -1;

  const liveIndex = predictions.findIndex((prediction) => prediction.status === "live" || prediction.status === "halftime");
  if (liveIndex >= 0) return liveIndex;

  const nowMs = now.getTime();
  const upcomingIndex = predictions.findIndex((prediction) => {
    const kickoffMs = new Date(prediction.revealAt).getTime();
    return Number.isFinite(kickoffMs) && kickoffMs >= nowMs;
  });
  if (upcomingIndex >= 0) return upcomingIndex;

  const dayMs = 24 * 60 * 60 * 1000;
  const recentIndex = predictions.findIndex((prediction) => {
    const kickoffMs = new Date(prediction.revealAt).getTime();
    return Number.isFinite(kickoffMs) && kickoffMs <= nowMs && nowMs - kickoffMs <= dayMs;
  });
  if (recentIndex >= 0) return recentIndex;

  for (let index = predictions.length - 1; index >= 0; index -= 1) {
    if (predictions[index]?.revealed) return index;
  }

  return 0;
}
