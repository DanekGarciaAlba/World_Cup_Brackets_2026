import "server-only";
import { getProviderRequestCounts, getTeams, getFixtures, getStandings, resolveWorldCup2026League } from "@/lib/providers/apiFootball";
import type {
  ApiFootballFixtureResponse,
  ApiFootballStandingRow,
  ApiFootballStandingsResponse,
  ApiFootballTeamResponse,
} from "@/lib/providers/types";
import { createAdminClient } from "@/lib/supabase/admin";

type SyncOptions = {
  forced?: boolean;
};

const OFFICIAL_GROUP_PATTERN = /^Group [A-L]$/;

function toInt(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function statusFromProvider(shortStatus: string | undefined) {
  switch ((shortStatus || "").toUpperCase()) {
    case "1H":
    case "2H":
    case "ET":
    case "P":
    case "BT":
    case "LIVE":
      return "live";
    case "HT":
      return "halftime";
    case "FT":
    case "AET":
    case "PEN":
      return "finished";
    case "PST":
    case "SUSP":
    case "INT":
      return "postponed";
    case "CANC":
    case "ABD":
    case "AWD":
    case "WO":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function stageFromRound(round: string | null | undefined) {
  if (!round) return null;
  const [stage] = round.split(" - ");
  return stage?.trim() || round;
}

function officialGroupFromStandings(group: string | undefined) {
  if (!group) return null;
  return OFFICIAL_GROUP_PATTERN.test(group) ? group : null;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function flattenStandings(standingsPayload: ApiFootballStandingsResponse[]) {
  const groups = standingsPayload[0]?.league?.standings ?? [];
  return groups.flatMap((group) => group.map((row) => ({ groupName: row.group, row })));
}

function groupMapFromStandings(rows: Array<{ groupName?: string; row: ApiFootballStandingRow }>) {
  const map = new Map<number, string>();
  for (const { groupName, row } of rows) {
    const officialGroup = officialGroupFromStandings(groupName);
    const teamId = toInt(row.team?.id);
    if (officialGroup && teamId) map.set(teamId, officialGroup);
  }
  return map;
}

function rowsToTeams(teamRows: ApiFootballTeamResponse[], standingsRows: Array<{ groupName?: string; row: ApiFootballStandingRow }>) {
  const groupByTeamId = groupMapFromStandings(standingsRows);
  const byId = new Map<number, Record<string, unknown>>();

  for (const item of teamRows) {
    const id = toInt(item.team?.id);
    if (!id || !item.team?.name) continue;
    byId.set(id, {
      id,
      name: item.team.name,
      code: item.team.code ?? null,
      country: item.team.country ?? null,
      group_name: groupByTeamId.get(id) ?? null,
      logo_url: item.team.logo ?? null,
      provider_payload: item,
      updated_at: new Date().toISOString(),
    });
  }

  for (const { row } of standingsRows) {
    const id = toInt(row.team?.id);
    if (!id || !row.team?.name || byId.has(id)) continue;
    byId.set(id, {
      id,
      name: row.team.name,
      code: null,
      country: null,
      group_name: groupByTeamId.get(id) ?? null,
      logo_url: row.team.logo ?? null,
      provider_payload: { standings: row },
      updated_at: new Date().toISOString(),
    });
  }

  return Array.from(byId.values());
}

function rowsToStandings(leagueId: number, season: number, rows: Array<{ groupName?: string; row: ApiFootballStandingRow }>) {
  return rows
    .map(({ groupName, row }) => {
      const teamId = toInt(row.team?.id);
      if (!teamId) return null;

      return {
        league_id: leagueId,
        season,
        group_name: groupName ?? null,
        team_id: teamId,
        rank: toInt(row.rank),
        points: toInt(row.points),
        played: toInt(row.all?.played),
        won: toInt(row.all?.win),
        drawn: toInt(row.all?.draw),
        lost: toInt(row.all?.lose),
        goals_for: toInt(row.all?.goals?.for),
        goals_against: toInt(row.all?.goals?.against),
        goal_difference: toInt(row.goalsDiff),
        provider_payload: row,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(isPresent);
}

function rowsToFixtures(leagueId: number, season: number, fixtures: ApiFootballFixtureResponse[], groupByTeamId: Map<number, string>) {
  return fixtures
    .map((item) => {
      const id = toInt(item.fixture?.id);
      const kickoffAt = item.fixture?.date;
      if (!id || !kickoffAt) return null;

      const homeTeamId = toInt(item.teams?.home?.id);
      const awayTeamId = toInt(item.teams?.away?.id);
      const homeGroup = homeTeamId ? groupByTeamId.get(homeTeamId) : null;
      const awayGroup = awayTeamId ? groupByTeamId.get(awayTeamId) : null;
      const round = item.league?.round ?? null;

      return {
        id,
        league_id: leagueId,
        season,
        round,
        group_name: homeGroup && homeGroup === awayGroup ? homeGroup : null,
        stage: stageFromRound(round),
        kickoff_at: kickoffAt,
        status: statusFromProvider(item.fixture?.status?.short),
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: toInt(item.goals?.home),
        away_score: toInt(item.goals?.away),
        penalty_home_score: toInt(item.score?.penalty?.home),
        penalty_away_score: toInt(item.score?.penalty?.away),
        venue_name: item.fixture?.venue?.name ?? null,
        provider_payload: item,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(isPresent);
}

export async function syncWorldCup(options: SyncOptions = {}) {
  const leagueId = await resolveWorldCup2026League();
  const season = process.env.API_FOOTBALL_SEASON || "2026";
  const numericSeason = Number(season);
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

  const [teamsPayload, fixturesPayload, standingsPayload] = await Promise.all([
    getTeams({ league: leagueId, season }),
    getFixtures({ league: leagueId, season }),
    getStandings({ league: leagueId, season }),
  ]);

  actions.push("provider_payloads_loaded");

  const standingsRows = flattenStandings(standingsPayload.response as ApiFootballStandingsResponse[]);
  const groupByTeamId = groupMapFromStandings(standingsRows);
  const teamRows = rowsToTeams(teamsPayload.response as ApiFootballTeamResponse[], standingsRows);
  const fixtureRows = rowsToFixtures(leagueId, numericSeason, fixturesPayload.response as ApiFootballFixtureResponse[], groupByTeamId);
  const standingRows = rowsToStandings(leagueId, numericSeason, standingsRows);

  const supabase = createAdminClient();

  if (teamRows.length > 0) {
    const { error } = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
    if (error) throw new Error(`Team import failed: ${error.message}`);
    actions.push(`teams_imported:${teamRows.length}`);
  }

  if (fixtureRows.length > 0) {
    const { error } = await supabase.from("matches").upsert(fixtureRows, { onConflict: "id" });
    if (error) throw new Error(`Fixture import failed: ${error.message}`);
    actions.push(`fixtures_imported:${fixtureRows.length}`);
  }

  if (standingRows.length > 0) {
    const { error } = await supabase.from("standings").upsert(standingRows, { onConflict: "league_id,season,group_name,team_id" });
    if (error) throw new Error(`Standings import failed: ${error.message}`);
    actions.push(`standings_imported:${standingRows.length}`);
  }

  await supabase.from("sync_logs").insert({
    sync_type: options.forced ? "manual" : "cron",
    status: "success",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    provider_requests: getProviderRequestCounts(),
    message: `Imported ${teamRows.length} teams, ${fixtureRows.length} fixtures, and ${standingRows.length} standings rows.`,
  });

  return {
    ok: true,
    startedAt,
    leagueId,
    season,
    actions,
    imported: {
      teams: teamRows.length,
      fixtures: fixtureRows.length,
      standings: standingRows.length,
    },
    providerRequests: getProviderRequestCounts(),
  };
}
