create table if not exists public.user_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  avatar_base text not null default 'captain',
  skin_tone text not null default 'medium',
  hair_style text not null default 'short',
  hair_color text not null default 'dark',
  kit_primary_color text not null default '#31b7ff',
  kit_secondary_color text not null default '#f7c948',
  kit_pattern text not null default 'sash',
  badge_shape text not null default 'shield',
  celebration_style text not null default 'trophy_lift',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mini_league_activity (
  id uuid primary key default gen_random_uuid(),
  mini_league_id uuid not null references public.mini_leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_emote_events (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  mini_league_id uuid not null references public.mini_leagues(id) on delete cascade,
  emote_type text not null,
  match_id bigint references public.matches(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_emote_events_not_self check (from_user_id <> to_user_id)
);

create index if not exists idx_user_avatars_user_id on public.user_avatars(user_id);
create index if not exists idx_mini_league_activity_league_created on public.mini_league_activity(mini_league_id, created_at desc);
create index if not exists idx_mini_league_activity_user_created on public.mini_league_activity(user_id, created_at desc);
create index if not exists idx_user_emote_events_league_created on public.user_emote_events(mini_league_id, created_at desc);
create index if not exists idx_user_emote_events_cooldown on public.user_emote_events(from_user_id, to_user_id, emote_type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_avatars_set_updated_at on public.user_avatars;
create trigger user_avatars_set_updated_at
before update on public.user_avatars
for each row execute function public.set_updated_at();

alter table public.user_avatars enable row level security;
alter table public.mini_league_activity enable row level security;
alter table public.user_emote_events enable row level security;

grant select on public.user_avatars to anon, authenticated;
grant select, insert, update on public.user_avatars to authenticated;
grant select, insert on public.mini_league_activity to authenticated;
grant select, insert on public.user_emote_events to authenticated;

drop policy if exists "public_read_user_avatars" on public.user_avatars;
create policy "public_read_user_avatars"
on public.user_avatars for select
to anon, authenticated
using (true);

drop policy if exists "user_avatars_write_own" on public.user_avatars;
create policy "user_avatars_write_own"
on public.user_avatars for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "mini_league_activity_member_read" on public.mini_league_activity;
create policy "mini_league_activity_member_read"
on public.mini_league_activity for select
to authenticated
using (
  exists (
    select 1
    from public.mini_league_members mlm
    where mlm.mini_league_id = mini_league_activity.mini_league_id
      and mlm.user_id = (select auth.uid())
  )
);

drop policy if exists "mini_league_activity_member_insert" on public.mini_league_activity;
create policy "mini_league_activity_member_insert"
on public.mini_league_activity for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.mini_league_members mlm
    where mlm.mini_league_id = mini_league_activity.mini_league_id
      and mlm.user_id = (select auth.uid())
  )
);

drop policy if exists "user_emote_events_member_read" on public.user_emote_events;
create policy "user_emote_events_member_read"
on public.user_emote_events for select
to authenticated
using (
  exists (
    select 1
    from public.mini_league_members mlm
    where mlm.mini_league_id = user_emote_events.mini_league_id
      and mlm.user_id = (select auth.uid())
  )
);

drop policy if exists "user_emote_events_insert_with_cooldown" on public.user_emote_events;
create policy "user_emote_events_insert_with_cooldown"
on public.user_emote_events for insert
to authenticated
with check (
  from_user_id = (select auth.uid())
  and exists (
    select 1
    from public.mini_league_members sender
    where sender.mini_league_id = user_emote_events.mini_league_id
      and sender.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.mini_league_members receiver
    where receiver.mini_league_id = user_emote_events.mini_league_id
      and receiver.user_id = user_emote_events.to_user_id
  )
  and not exists (
    select 1
    from public.user_emote_events recent
    where recent.from_user_id = (select auth.uid())
      and recent.to_user_id = user_emote_events.to_user_id
      and recent.emote_type = user_emote_events.emote_type
      and recent.created_at > now() - interval '10 minutes'
  )
);
