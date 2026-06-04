alter table public.profiles
  add column if not exists favorite_team_id bigint references public.teams(id);
