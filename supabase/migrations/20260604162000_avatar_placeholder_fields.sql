alter table public.user_avatars
  add column if not exists kit_number text not null default '26';
