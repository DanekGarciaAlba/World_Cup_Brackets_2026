export function calculateRankedClubRows({
  leagues,
  members,
  pointsByUserId,
  previousRankByLeagueId = new Map<string, number>(),
  excludedUserIds = new Set<string>(),
}: {
  leagues: Array<{ id: string; name: string }>;
  members: Array<{ mini_league_id: string; user_id: string }>;
  pointsByUserId: Map<string, number>;
  previousRankByLeagueId?: Map<string, number>;
  excludedUserIds?: Set<string>;
}) {
  const membersByLeague = new Map<string, Set<string>>();
  for (const member of members) {
    if (excludedUserIds.has(member.user_id)) continue;
    const list = membersByLeague.get(member.mini_league_id) ?? new Set<string>();
    list.add(member.user_id);
    membersByLeague.set(member.mini_league_id, list);
  }

  const rows = leagues
    .map((league) => {
      const leagueMembers = Array.from(membersByLeague.get(league.id) ?? []);
      const sortedMembers = [...leagueMembers].sort((a, b) => (pointsByUserId.get(b) ?? 0) - (pointsByUserId.get(a) ?? 0));
      const topTen = sortedMembers.slice(0, 10);
      const clubPoints = topTen.reduce((sum, userId) => sum + (pointsByUserId.get(userId) ?? 0), 0);
      const avgPoints = topTen.length > 0 ? clubPoints / topTen.length : 0;

      return {
        mini_league_id: league.id,
        group_name: league.name,
        member_count: leagueMembers.length,
        club_points: clubPoints,
        avg_points: Number(avgPoints.toFixed(2)),
        top_member_user_id: sortedMembers[0] ?? null,
        current_rank: 0,
        previous_rank: previousRankByLeagueId.get(league.id) || null,
        rank_change: 0,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row) => row.member_count >= 2)
    .sort((a, b) => b.club_points - a.club_points || b.avg_points - a.avg_points || a.group_name.localeCompare(b.group_name));

  rows.forEach((row, index) => {
    row.current_rank = index + 1;
    row.rank_change = row.previous_rank ? row.previous_rank - row.current_rank : 0;
  });

  return rows;
}
