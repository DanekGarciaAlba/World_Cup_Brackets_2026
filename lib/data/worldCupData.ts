import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorldCupDataQuality } from "@/lib/data/worldCupValidation";

export type TeamSummary = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  groupName: string | null;
  logoUrl: string | null;
};

export type MatchSummary = {
  id: number;
  round: string | null;
  groupName: string | null;
  stage: string | null;
  kickoffAt: string;
  status: string;
  venueName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  homeTeam: TeamSummary | null;
  awayTeam: TeamSummary | null;
};

export type LeaderboardSummary = {
  userId: string;
  rank: number;
  displayName: string;
  department: string | null;
  totalPoints: number;
  matchPoints: number;
  groupPoints: number;
  bracketPoints: number;
  exactScores: number;
  avatar: AvatarSummary | null;
};

export type AvatarSummary = {
  initials: string;
  kitPrimary: string;
  kitSecondary: string;
  kitNumber: string;
};

export type GroupSummary = {
  groupName: string;
  teams: TeamSummary[];
};

export type ActivitySummary = {
  id: string;
  message: string;
  createdAt: string;
  activityType: string;
};

export type DashboardData = {
  quality: Awaited<ReturnType<typeof getWorldCupDataQuality>>;
  matches: MatchSummary[];
  nextMatches: MatchSummary[];
  liveMatch: MatchSummary | null;
  leaderboard: LeaderboardSummary[];
  groups: GroupSummary[];
  activity: ActivitySummary[];
  miniLeagueCount: number;
  predictionCount: number;
  currentUserAvatar: AvatarSummary | null;
};

function teamToSummary(team: any): TeamSummary {
  return {
    id: Number(team.id),
    name: String(team.name ?? "Team pending"),
    code: typeof team.code === "string" ? team.code : null,
    country: typeof team.country === "string" ? team.country : null,
    groupName: typeof team.group_name === "string" ? team.group_name : null,
    logoUrl: typeof team.logo_url === "string" ? team.logo_url : null,
  };
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function avatarToSummary(displayName: string, avatar: any): AvatarSummary {
  return {
    initials: initialsFromName(displayName),
    kitPrimary: typeof avatar?.kit_primary_color === "string" ? avatar.kit_primary_color : "#4f6bff",
    kitSecondary: typeof avatar?.kit_secondary_color === "string" ? avatar.kit_secondary_color : "#d8ad4c",
    kitNumber: typeof avatar?.kit_number === "string" ? avatar.kit_number : "26",
  };
}

function matchToSummary(match: any, teamsById: Map<number, TeamSummary>): MatchSummary {
  const homeTeamId = typeof match.home_team_id === "number" ? match.home_team_id : Number(match.home_team_id);
  const awayTeamId = typeof match.away_team_id === "number" ? match.away_team_id : Number(match.away_team_id);
  return {
    id: Number(match.id),
    round: typeof match.round === "string" ? match.round : null,
    groupName: typeof match.group_name === "string" ? match.group_name : null,
    stage: typeof match.stage === "string" ? match.stage : null,
    kickoffAt: String(match.kickoff_at),
    status: String(match.status ?? "scheduled"),
    venueName: typeof match.venue_name === "string" ? match.venue_name : null,
    homeScore: typeof match.home_score === "number" ? match.home_score : null,
    awayScore: typeof match.away_score === "number" ? match.away_score : null,
    penaltyHomeScore: typeof match.penalty_home_score === "number" ? match.penalty_home_score : null,
    penaltyAwayScore: typeof match.penalty_away_score === "number" ? match.penalty_away_score : null,
    homeTeam: Number.isFinite(homeTeamId) ? teamsById.get(homeTeamId) ?? null : null,
    awayTeam: Number.isFinite(awayTeamId) ? teamsById.get(awayTeamId) ?? null : null,
  };
}

export async function getWorldCupDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const [
    quality,
    teamsResult,
    allMatchesResult,
    nextMatchesResult,
    liveMatchesResult,
    leaderboardResult,
    profilesResult,
    avatarsResult,
    groupsResult,
    activityResult,
    miniLeagueCount,
    matchPredictionCount,
    groupPredictionCount,
    bracketPredictionCount,
    tournamentPredictionCount,
  ] = await Promise.all([
    getWorldCupDataQuality(supabase),
    supabase.from("teams").select("id,name,code,country,group_name,logo_url").limit(500),
    supabase
      .from("matches")
      .select("id,round,group_name,stage,kickoff_at,status,venue_name,home_team_id,away_team_id,home_score,away_score,penalty_home_score,penalty_away_score")
      .order("kickoff_at", { ascending: true })
      .limit(150),
    supabase
      .from("matches")
      .select("id,round,group_name,stage,kickoff_at,status,venue_name,home_team_id,away_team_id,home_score,away_score,penalty_home_score,penalty_away_score")
      .gte("kickoff_at", now)
      .order("kickoff_at", { ascending: true })
      .limit(8),
    supabase
      .from("matches")
      .select("id,round,group_name,stage,kickoff_at,status,venue_name,home_team_id,away_team_id,home_score,away_score,penalty_home_score,penalty_away_score")
      .in("status", ["live", "halftime"])
      .order("kickoff_at", { ascending: true })
      .limit(1),
    supabase
      .from("leaderboard_cache")
      .select("user_id,total_points,match_points,group_points,bracket_points,exact_scores")
      .order("total_points", { ascending: false })
      .limit(12),
    supabase.from("profiles").select("id,display_name,department").limit(500),
    supabase.from("user_avatars").select("user_id,kit_primary_color,kit_secondary_color,kit_number").limit(500),
    supabase.from("teams").select("id,name,code,country,group_name,logo_url").not("group_name", "is", null).order("group_name").order("name").limit(500),
    supabase.from("mini_league_activity").select("id,message,activity_type,created_at").order("created_at", { ascending: false }).limit(8),
    countRows("mini_leagues"),
    countRows("match_predictions"),
    countRows("group_predictions"),
    countRows("bracket_predictions"),
    countRows("tournament_predictions"),
  ]);

  async function countRows(table: string) {
    const { count } = await createAdminClient().from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  }

  const teams = (teamsResult.data ?? []).map(teamToSummary);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const matches = (allMatchesResult.data ?? []).map((match) => matchToSummary(match, teamsById));
  const nextMatches = (nextMatchesResult.data ?? []).map((match) => matchToSummary(match, teamsById));
  const liveMatch = (liveMatchesResult.data ?? [])[0] ? matchToSummary((liveMatchesResult.data ?? [])[0], teamsById) : null;

  const profilesById = new Map((profilesResult.data ?? []).map((profile: any) => [String(profile.id), profile]));
  const avatarsByUserId = new Map((avatarsResult.data ?? []).map((avatar: any) => [String(avatar.user_id), avatar]));
  const leaderboard = (leaderboardResult.data ?? []).map((entry: any, index) => {
    const profile = profilesById.get(String(entry.user_id));
    const displayName = typeof profile?.display_name === "string" && profile.display_name ? profile.display_name : "Player";
    return {
      userId: String(entry.user_id),
      rank: index + 1,
      displayName,
      department: typeof profile?.department === "string" ? profile.department : null,
      totalPoints: Number(entry.total_points ?? 0),
      matchPoints: Number(entry.match_points ?? 0),
      groupPoints: Number(entry.group_points ?? 0),
      bracketPoints: Number(entry.bracket_points ?? 0),
      exactScores: Number(entry.exact_scores ?? 0),
      avatar: avatarToSummary(displayName, avatarsByUserId.get(String(entry.user_id))),
    } satisfies LeaderboardSummary;
  });

  const groupedTeams = (groupsResult.data ?? []).map(teamToSummary).reduce<Record<string, TeamSummary[]>>((acc, team) => {
    if (!team.groupName) return acc;
    acc[team.groupName] ||= [];
    acc[team.groupName].push(team);
    return acc;
  }, {});

  const groups = Object.entries(groupedTeams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupTeams]) => ({ groupName, teams: groupTeams }));

  const activity = (activityResult.data ?? []).map((item: any) => ({
    id: String(item.id),
    message: typeof item.message === "string" && item.message ? item.message : "Mini-league activity recorded.",
    createdAt: String(item.created_at),
    activityType: String(item.activity_type ?? "activity"),
  }));

  return {
    quality,
    matches,
    nextMatches,
    liveMatch,
    leaderboard,
    groups,
    activity,
    miniLeagueCount,
    predictionCount: matchPredictionCount + groupPredictionCount + bracketPredictionCount + tournamentPredictionCount,
    currentUserAvatar: null,
  };
}

export async function getTeamsForProfile() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("teams").select("id,name").order("name").limit(100);
  return (data ?? []).map((team: any) => ({ id: Number(team.id), name: String(team.name) }));
}
