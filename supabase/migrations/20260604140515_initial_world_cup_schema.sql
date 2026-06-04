create extension if not exists pgcrypto;

do $$ begin
  create type public.profile_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.match_status as enum ('scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id bigint primary key,
  name text not null,
  code text,
  country text,
  group_name text,
  logo_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id bigint primary key,
  league_id bigint not null,
  season int not null,
  round text,
  group_name text,
  stage text,
  kickoff_at timestamptz not null,
  status public.match_status not null default 'scheduled',
  home_team_id bigint references public.teams(id),
  away_team_id bigint references public.teams(id),
  home_score int,
  away_score int,
  penalty_home_score int,
  penalty_away_score int,
  venue_name text,
  provider_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.standings (
  id uuid primary key default gen_random_uuid(),
  league_id bigint not null,
  season int not null,
  group_name text,
  team_id bigint not null references public.teams(id),
  rank int,
  points int,
  played int,
  won int,
  drawn int,
  lost int,
  goals_for int,
  goals_against int,
  goal_difference int,
  provider_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (league_id, season, group_name, team_id)
);

create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  home_score int not null,
  away_score int not null,
  boost_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.group_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_name text not null,
  winner_team_id bigint references public.teams(id),
  runner_up_team_id bigint references public.teams(id),
  third_place_team_id bigint references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_name)
);

create table if not exists public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  champion_team_id bigint references public.teams(id),
  finalist_team_ids bigint[] not null default '{}'::bigint[],
  semi_finalist_team_ids bigint[] not null default '{}'::bigint[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.bracket_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint references public.matches(id) on delete cascade,
  round text not null,
  predicted_winner_team_id bigint references public.teams(id),
  penalty_winner_team_id bigint references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id, round)
);

create table if not exists public.prediction_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_type text not null,
  prediction_id uuid not null,
  points int not null,
  reason_code text not null,
  reason text not null,
  scored_at timestamptz not null default now(),
  unique (prediction_type, prediction_id, reason_code)
);

create table if not exists public.leaderboard_cache (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_points int not null default 0,
  match_points int not null default 0,
  group_points int not null default 0,
  bracket_points int not null default 0,
  bonus_points int not null default 0,
  exact_scores int not null default 0,
  correct_outcomes int not null default 0,
  current_rank int,
  previous_rank int,
  rank_change int,
  updated_at timestamptz not null default now()
);

create table if not exists public.mini_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.mini_league_members (
  mini_league_id uuid not null references public.mini_leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mini_league_id, user_id)
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  provider_requests jsonb not null default '{}'::jsonb,
  message text,
  error text
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.standings enable row level security;
alter table public.match_predictions enable row level security;
alter table public.group_predictions enable row level security;
alter table public.tournament_predictions enable row level security;
alter table public.bracket_predictions enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.leaderboard_cache enable row level security;
alter table public.mini_leagues enable row level security;
alter table public.mini_league_members enable row level security;
alter table public.sync_logs enable row level security;
alter table public.system_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.teams, public.matches, public.standings, public.leaderboard_cache to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.match_predictions, public.group_predictions, public.tournament_predictions, public.bracket_predictions to authenticated;
grant select, insert, update, delete on public.mini_leagues, public.mini_league_members to authenticated;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_write_own" on public.profiles;
create policy "profiles_write_own" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "public_read_teams" on public.teams;
create policy "public_read_teams" on public.teams for select to anon, authenticated using (true);

drop policy if exists "public_read_matches" on public.matches;
create policy "public_read_matches" on public.matches for select to anon, authenticated using (true);

drop policy if exists "public_read_standings" on public.standings;
create policy "public_read_standings" on public.standings for select to anon, authenticated using (true);

drop policy if exists "public_read_leaderboard" on public.leaderboard_cache;
create policy "public_read_leaderboard" on public.leaderboard_cache for select to anon, authenticated using (true);

drop policy if exists "match_predictions_read_after_lock_or_own" on public.match_predictions;
create policy "match_predictions_read_after_lock_or_own"
on public.match_predictions for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.matches m
    where m.id = match_id
    and (m.kickoff_at <= now() or m.status in ('live', 'halftime', 'finished'))
  )
);

drop policy if exists "match_predictions_write_own_before_lock" on public.match_predictions;
create policy "match_predictions_write_own_before_lock"
on public.match_predictions for all to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
    and m.kickoff_at > now()
    and m.status = 'scheduled'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
    and m.kickoff_at > now()
    and m.status = 'scheduled'
  )
);

drop policy if exists "group_predictions_own" on public.group_predictions;
create policy "group_predictions_own" on public.group_predictions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tournament_predictions_own" on public.tournament_predictions;
create policy "tournament_predictions_own" on public.tournament_predictions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "bracket_predictions_own" on public.bracket_predictions;
create policy "bracket_predictions_own" on public.bracket_predictions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "prediction_scores_own" on public.prediction_scores;
create policy "prediction_scores_own" on public.prediction_scores for select to authenticated using (user_id = auth.uid());

drop policy if exists "mini_leagues_member_read" on public.mini_leagues;
create policy "mini_leagues_member_read" on public.mini_leagues for select to authenticated using (
  owner_id = auth.uid()
  or exists (select 1 from public.mini_league_members mlm where mlm.mini_league_id = id and mlm.user_id = auth.uid())
);

drop policy if exists "mini_leagues_owner_write" on public.mini_leagues;
create policy "mini_leagues_owner_write" on public.mini_leagues for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mini_league_members_read_member" on public.mini_league_members;
create policy "mini_league_members_read_member" on public.mini_league_members for select to authenticated using (user_id = auth.uid());

drop policy if exists "mini_league_members_write_self" on public.mini_league_members;
create policy "mini_league_members_write_self" on public.mini_league_members for insert to authenticated with check (user_id = auth.uid());
