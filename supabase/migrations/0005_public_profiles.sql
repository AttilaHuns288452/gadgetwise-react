-- 0005: public reviewer identity + public profiles (section 6).
-- A reviewer's display name is public (it appears on their reviews and public
-- profile); their email and auth metadata are NOT. This view exposes only
-- id + display_name so public pages can name reviewers without leaking PII.
-- A plain view runs with the owner's rights (definer), so it serves the public
-- name regardless of the owner-only RLS on profiles.email.

create or replace view public.public_profiles as
  select
    id,
    coalesce(nullif(full_name, ''), 'Member') as display_name
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Reviews are already publicly readable (approved) via RLS in 0004. Public
-- profiles surface a user's approved reviews; no schema change needed there.
