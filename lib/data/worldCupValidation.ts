import type { SupabaseClient } from "@supabase/supabase-js";

export type ValidationStatus = "PASS" | "FAIL" | "WARNING" | "MANUAL REQUIRED";

export type ValidationRow = {
  Area: string;
  Check: string;
  Status: ValidationStatus;
  Notes: string;
};

export type DataQualityCounts = {
  teams: number;
  matches: number;
  groups: number;
  standings: number;
  leaderboardRows: number;
  predictions: number;
  miniLeagues: number;
};

export type DataQualitySummary = {
  counts: DataQualityCounts;
  groupLabels: string[];
  groupSizes: Record<string, number>;
  missingGroupData: boolean;
  missingFixtureData: boolean;
  duplicateTeamNames: string[];
  duplicateMatchIds: number[];
  fakeOrUnconfirmedRows: number;
  lastSync: {
    sync_type: string | null;
    status: string | null;
    started_at: string | null;
    finished_at: string | null;
    message: string | null;
    error: string | null;
  } | null;
  lastValidationStatus: ValidationStatus;
  rows: ValidationRow[];
};

type Client = SupabaseClient<any, any, any>;

type TeamRow = {
  id: number;
  name: string | null;
  country: string | null;
  group_name: string | null;
  provider_payload: Record<string, unknown> | null;
};

type MatchRow = {
  id: number;
  kickoff_at: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  group_name: string | null;
  stage: string | null;
  round: string | null;
  provider_payload: Record<string, unknown> | null;
};

type StandingRow = {
  team_id: number | null;
  group_name: string | null;
};

const expectedGroupLabels = Array.from({ length: 12 }, (_, index) => `Group ${String.fromCharCode(65 + index)}`);

function push(rows: ValidationRow[], Area: string, Check: string, Status: ValidationStatus, Notes: string) {
  rows.push({ Area, Check, Status, Notes });
}

function isEmptyPayload(payload: Record<string, unknown> | null | undefined) {
  return !payload || Object.keys(payload).length === 0;
}

function duplicateValues<T>(values: T[]) {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function worstStatus(rows: ValidationRow[]): ValidationStatus {
  if (rows.some((row) => row.Status === "FAIL")) return "FAIL";
  if (rows.some((row) => row.Status === "MANUAL REQUIRED")) return "MANUAL REQUIRED";
  if (rows.some((row) => row.Status === "WARNING")) return "WARNING";
  return "PASS";
}

async function countRows(client: Client, table: string) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getWorldCupDataQuality(client: Client): Promise<DataQualitySummary> {
  const rows: ValidationRow[] = [];

  const [
    teamsResult,
    matchesResult,
    standingsResult,
    lastSyncResult,
    leaderboardRows,
    matchPredictionRows,
    groupPredictionRows,
    tournamentPredictionRows,
    bracketPredictionRows,
    miniLeagues,
  ] = await Promise.all([
    client.from("teams").select("id,name,country,group_name,provider_payload").limit(500),
    client.from("matches").select("id,kickoff_at,home_team_id,away_team_id,group_name,stage,round,provider_payload").limit(150),
    client.from("standings").select("team_id,group_name").limit(500),
    client.from("sync_logs").select("sync_type,status,started_at,finished_at,message,error").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    countRows(client, "leaderboard_cache"),
    countRows(client, "match_predictions"),
    countRows(client, "group_predictions"),
    countRows(client, "tournament_predictions"),
    countRows(client, "bracket_predictions"),
    countRows(client, "mini_leagues"),
  ]);

  const teams = (teamsResult.data ?? []) as TeamRow[];
  const matches = (matchesResult.data ?? []) as MatchRow[];
  const standings = (standingsResult.data ?? []) as StandingRow[];
  const teamIds = new Set(teams.map((team) => team.id));
  const groupLabels = Array.from(new Set(teams.map((team) => team.group_name).filter(Boolean) as string[])).sort();
  const groupSizes = groupLabels.reduce<Record<string, number>>((acc, group) => {
    acc[group] = teams.filter((team) => team.group_name === group).length;
    return acc;
  }, {});
  const duplicateTeamNames = duplicateValues(
    teams
      .map((team) => team.name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const duplicateMatchIds = duplicateValues(matches.map((match) => match.id));
  const emptyTeamPayloadRows = teams.filter((team) => isEmptyPayload(team.provider_payload)).length;
  const emptyMatchPayloadRows = matches.filter((match) => isEmptyPayload(match.provider_payload)).length;
  const fakeOrUnconfirmedRows = emptyTeamPayloadRows + emptyMatchPayloadRows;

  if (teams.length === 0) {
    push(rows, "Teams", "Synced teams", "MANUAL REQUIRED", "World Cup data not synced yet. Run Admin Sync.");
  } else if (teams.length >= 48) {
    push(rows, "Teams", "Synced teams", "PASS", `${teams.length} teams found.`);
  } else {
    push(rows, "Teams", "Synced teams", "WARNING", `${teams.length} teams found; expected at least 48 or official unresolved placeholders.`);
  }

  const missingTeamNames = teams.filter((team) => !team.name || !team.country).length;
  push(
    rows,
    "Teams",
    "Name and country fields",
    teams.length === 0 ? "MANUAL REQUIRED" : missingTeamNames === 0 ? "PASS" : "FAIL",
    teams.length === 0
      ? "No synced teams to validate."
      : missingTeamNames === 0
        ? "All synced teams include display fields."
        : `${missingTeamNames} team rows are missing name/country data.`,
  );

  push(
    rows,
    "Teams",
    "Duplicate provider team IDs",
    duplicateValues(teams.map((team) => team.id)).length === 0 ? "PASS" : "FAIL",
    "Provider team ID is stored as teams.id and enforced by the primary key.",
  );

  push(
    rows,
    "Teams",
    "Duplicate team names",
    duplicateTeamNames.length === 0 ? "PASS" : "WARNING",
    duplicateTeamNames.length === 0 ? "No duplicate team names found." : `Review duplicates: ${duplicateTeamNames.join(", ")}.`,
  );

  if (matches.length === 0) {
    push(rows, "Matches", "Synced fixtures", "MANUAL REQUIRED", "World Cup data not synced yet. Run Admin Sync.");
  } else if (matches.length === 104) {
    push(rows, "Matches", "Expected fixture count", "PASS", "104 fixtures found.");
  } else {
    push(rows, "Matches", "Expected fixture count", "WARNING", `${matches.length} fixtures found; target is 104.`);
  }

  const missingKickoff = matches.filter((match) => !match.kickoff_at).length;
  push(
    rows,
    "Matches",
    "Kickoff timestamps",
    matches.length === 0 ? "MANUAL REQUIRED" : missingKickoff === 0 ? "PASS" : "FAIL",
    matches.length === 0
      ? "No synced fixtures to validate."
      : missingKickoff === 0
        ? "Every fixture has kickoff_at."
        : `${missingKickoff} fixtures are missing kickoff_at.`,
  );

  const missingTeams = matches.filter((match) => !match.home_team_id || !match.away_team_id).length;
  push(
    rows,
    "Matches",
    "Home/away teams",
    matches.length === 0 ? "MANUAL REQUIRED" : missingTeams === 0 ? "PASS" : "WARNING",
    matches.length === 0
      ? "No synced fixtures to validate."
      : missingTeams === 0
        ? "Every fixture has home/away team IDs."
        : `${missingTeams} fixtures have unresolved home/away slots.`,
  );

  push(
    rows,
    "Matches",
    "Duplicate provider match IDs",
    duplicateMatchIds.length === 0 ? "PASS" : "FAIL",
    duplicateMatchIds.length === 0 ? "Provider match ID is stored as matches.id and enforced by the primary key." : `Duplicates: ${duplicateMatchIds.join(", ")}.`,
  );

  const mixedProviderPayloads =
    matches.length > 0 && emptyMatchPayloadRows > 0 && emptyMatchPayloadRows < matches.length;
  push(
    rows,
    "Matches",
    "Provider payload integrity",
    matches.length === 0 ? "MANUAL REQUIRED" : mixedProviderPayloads ? "FAIL" : emptyMatchPayloadRows > 0 ? "MANUAL REQUIRED" : "PASS",
    matches.length === 0
      ? "No synced fixtures to validate."
      : mixedProviderPayloads
        ? `${emptyMatchPayloadRows} fixture rows have empty provider payloads mixed with provider rows.`
        : emptyMatchPayloadRows > 0
          ? "Fixture rows need provider payloads or an admin-confirmed official seed marker."
          : "Fixture provider payloads are present.",
  );

  if (groupLabels.length === 0) {
    push(rows, "Groups", "Group labels", "MANUAL REQUIRED", "Group data pending sync.");
  } else {
    const invalidGroups = groupLabels.filter((group) => !expectedGroupLabels.includes(group));
    const missingGroups = expectedGroupLabels.filter((group) => !groupLabels.includes(group));
    push(
      rows,
      "Groups",
      "Exactly 12 labels A-L",
      invalidGroups.length === 0 && missingGroups.length === 0 ? "PASS" : "WARNING",
      invalidGroups.length === 0 && missingGroups.length === 0
        ? "Groups A through L detected."
        : `Detected ${groupLabels.length} groups. Missing: ${missingGroups.join(", ") || "none"}. Invalid: ${invalidGroups.join(", ") || "none"}.`,
    );

    const irregularGroups = Object.entries(groupSizes).filter(([, size]) => size !== 4);
    push(
      rows,
      "Groups",
      "Four teams per group",
      irregularGroups.length === 0 ? "PASS" : "WARNING",
      irregularGroups.length === 0
        ? "Every detected group has 4 teams."
        : irregularGroups.map(([group, size]) => `${group}: ${size}`).join("; "),
    );

    push(
      rows,
      "Groups",
      "Official seed confirmation",
      fakeOrUnconfirmedRows === 0 && groupLabels.length === 12 ? "PASS" : "MANUAL REQUIRED",
      fakeOrUnconfirmedRows === 0 && groupLabels.length === 12
        ? "Group assignments are backed by provider payloads."
        : "Confirm synced group assignments against API-Football/FIFA before labeling them official.",
    );
  }

  if (standings.length === 0) {
    push(rows, "Standings", "Availability", "WARNING", "Standings pending.");
  } else {
    const unmappedStandings = standings.filter((standing) => !standing.team_id || !teamIds.has(standing.team_id)).length;
    push(
      rows,
      "Standings",
      "Rows map to teams",
      unmappedStandings === 0 ? "PASS" : "FAIL",
      unmappedStandings === 0 ? "Every standings row maps to a team." : `${unmappedStandings} standings rows do not map to synced teams.`,
    );
  }

  const knockoutMatches = matches.filter((match) => {
    const text = `${match.stage ?? ""} ${match.round ?? ""}`.toLowerCase();
    return /round of 32|round of 16|quarter|semi|final|knockout/.test(text);
  });
  push(
    rows,
    "Bracket",
    "Official knockout fixtures",
    knockoutMatches.length > 0 ? "PASS" : "WARNING",
    knockoutMatches.length > 0
      ? `${knockoutMatches.length} official knockout fixtures detected.`
      : "Bracket remains projected/unavailable until official knockout fixtures sync.",
  );

  const counts: DataQualityCounts = {
    teams: teams.length,
    matches: matches.length,
    groups: groupLabels.length,
    standings: standings.length,
    leaderboardRows,
    predictions: matchPredictionRows + groupPredictionRows + tournamentPredictionRows + bracketPredictionRows,
    miniLeagues,
  };

  return {
    counts,
    groupLabels,
    groupSizes,
    missingGroupData: groupLabels.length === 0,
    missingFixtureData: matches.length === 0,
    duplicateTeamNames,
    duplicateMatchIds,
    fakeOrUnconfirmedRows,
    lastSync: lastSyncResult.data ?? null,
    lastValidationStatus: worstStatus(rows),
    rows,
  };
}
