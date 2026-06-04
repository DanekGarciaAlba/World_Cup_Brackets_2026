import "server-only";
import { getProviderRequestCounts, getTeams, getFixtures, getStandings, resolveWorldCup2026League } from "@/lib/providers/apiFootball";
import { createAdminClient } from "@/lib/supabase/admin";

type SyncOptions = {
  forced?: boolean;
};

export async function syncWorldCup(options: SyncOptions = {}) {
  const leagueId = await resolveWorldCup2026League();
  const season = process.env.API_FOOTBALL_SEASON || "2026";
  const startedAt = new Date().toISOString();
  const actions: string[] = [];

  if (!leagueId) {
    return {
      ok: false,
      startedAt,
      actions,
      error: "World Cup league ID is not configured or resolved",
    };
  }

  await getTeams({ league: leagueId, season });
  actions.push("teams_checked");

  await getFixtures({ league: leagueId, season });
  actions.push("fixtures_checked");

  await getStandings({ league: leagueId, season });
  actions.push("standings_checked");

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createAdminClient();
    await supabase.from("sync_logs").insert({
      sync_type: options.forced ? "manual" : "cron",
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      provider_requests: getProviderRequestCounts(),
      message: "Infrastructure sync probe completed",
    });
  }

  return {
    ok: true,
    startedAt,
    leagueId,
    season,
    actions,
    providerRequests: getProviderRequestCounts(),
  };
}
