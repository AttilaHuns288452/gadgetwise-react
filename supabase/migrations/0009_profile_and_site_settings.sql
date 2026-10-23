-- 0009: profile editing fields + admin-managed site settings.
--
-- profiles.bio / avatar_url are ordinary user-editable public profile fields.
-- Auth-critical identity stays in auth.users and admin_users; nothing here can
-- change roles or permissions. The public_profiles view exposes exactly the
-- fields a reviewer's public page may show (name, bio, avatar) and nothing else.
--
-- site_settings holds small admin-controlled public content (the homepage
-- announcement). Reads are public because the banner renders for everyone;
-- writes are admin-only via is_admin().

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_url text;

create or replace view public.public_profiles as
  select
    id,
    coalesce(nullif(full_name, ''), 'Member') as display_name,
    nullif(bio, '') as bio,
    nullif(avatar_url, '') as avatar_url
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.site_settings enable row level security;

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
  on public.site_settings for select using (true);

drop policy if exists "admin write site settings" on public.site_settings;
create policy "admin write site settings"
  on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());
