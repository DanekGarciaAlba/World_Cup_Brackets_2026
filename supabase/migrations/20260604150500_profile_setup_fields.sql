alter table public.profiles
  add column if not exists department text,
  add column if not exists favorite_country text;
