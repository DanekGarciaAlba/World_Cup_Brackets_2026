create index if not exists idx_matches_home_team_id on public.matches(home_team_id);
create index if not exists idx_matches_away_team_id on public.matches(away_team_id);
create index if not exists idx_matches_kickoff_at on public.matches(kickoff_at);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_standings_team_id on public.standings(team_id);
create index if not exists idx_match_predictions_match_id on public.match_predictions(match_id);
create index if not exists idx_match_predictions_user_id on public.match_predictions(user_id);
create index if not exists idx_group_predictions_winner_team_id on public.group_predictions(winner_team_id);
create index if not exists idx_group_predictions_runner_up_team_id on public.group_predictions(runner_up_team_id);
create index if not exists idx_group_predictions_third_place_team_id on public.group_predictions(third_place_team_id);
create index if not exists idx_tournament_predictions_champion_team_id on public.tournament_predictions(champion_team_id);
create index if not exists idx_bracket_predictions_match_id on public.bracket_predictions(match_id);
create index if not exists idx_bracket_predictions_predicted_winner_team_id on public.bracket_predictions(predicted_winner_team_id);
create index if not exists idx_bracket_predictions_penalty_winner_team_id on public.bracket_predictions(penalty_winner_team_id);
create index if not exists idx_prediction_scores_user_id on public.prediction_scores(user_id);
create index if not exists idx_mini_leagues_owner_id on public.mini_leagues(owner_id);
create index if not exists idx_mini_league_members_user_id on public.mini_league_members(user_id);

drop policy if exists "sync_logs_no_client_access" on public.sync_logs;
create policy "sync_logs_no_client_access" on public.sync_logs for select to authenticated using (false);

drop policy if exists "system_settings_no_client_access" on public.system_settings;
create policy "system_settings_no_client_access" on public.system_settings for select to authenticated using (false);
