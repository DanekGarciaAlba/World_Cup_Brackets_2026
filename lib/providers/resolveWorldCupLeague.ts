import "server-only";
import { getLeagues } from "@/lib/providers/apiFootball";

export async function findWorldCupLeagueCandidates() {
  const season = process.env.API_FOOTBALL_SEASON || "2026";
  const result = await getLeagues({ search: "world cup", season });

  return result.response.map((item) => ({
    leagueId: item.league.id,
    name: item.league.name,
    country: item.country?.name ?? null,
    seasons: item.seasons?.map((entry) => entry.year) ?? [],
  }));
}
