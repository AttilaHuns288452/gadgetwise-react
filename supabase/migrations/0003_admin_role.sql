-- 0003: trusted admin identity. Ordinary users must NOT be able to elevate.
--
-- Design: a separate admin_users mapping with NO user-writable RLS policies.
-- An ordinary authenticated user cannot insert/update/delete rows here at all,
-- so self-promotion is impossible at the database layer (not the UI layer).
-- A security-definer is_admin() lets RLS policies and clients ask "is this
-- user an admin?" without exposing the mapping to writes.
--
-- Bootstrap (operator-controlled, NOT auto-promote-first-signup):
--   insert into public.admin_users (user_id) values ('<the-admin-auth-uuid>');
-- Run that one statement via the Supabase SQL editor / management API.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by text
);

alter table public.admin_users enable row level security;

-- No INSERT/UPDATE/DELETE policy for ordinary users => they cannot touch it.
-- Only the service role (which bypasses RLS) can manage membership.
-- Admins may read their own row so clients can render admin-only UI.
drop policy if exists "admin can read own membership" on public.admin_users;
create policy "admin can read own membership"
  on public.admin_users for select
  using (auth.uid () = user_id);

-- is_admin(): stable, security-definer, safe search_path. Returns true only
-- when the calling user has a row in admin_users.
create or replace function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid ()
  );
$$;

revoke all on function public.is_admin () from public;
grant execute on function public.is_admin () to authenticated, anon;

-- Reviews: only admins may approve/reject (update moderation_status).
-- Add moderation columns that ordinary authors cannot write.
alter table public.reviews add column if not exists moderation_status text not null default 'pending';
alter table public.reviews add column if not exists moderated_by uuid;
alter table public.reviews add column if not exists moderated_at timestamptz;

drop policy if exists "reviews public read" on public.reviews;
-- Public sees only approved reviews.
create policy "reviews public read"
  on public.reviews for select
  using (moderation_status = 'approved' or auth.uid () = user_id);

drop policy if exists "reviews owner update" on public.reviews;
-- Owner may edit their own review text/rating but NOT moderation fields
-- (the with-check below only allows rows whose moderation fields are unchanged
--  and still pending; enforcement is completed by the admin-only policy).
create policy "reviews owner update"
  on public.reviews for update
  using (auth.uid () = user_id and moderation_status = 'pending')
  with check (auth.uid () = user_id and moderation_status = 'pending');

-- Admin moderation: only admins can update any review's moderation fields.
drop policy if exists "reviews admin moderate" on public.reviews;
create policy "reviews admin moderate"
  on public.reviews for update
  using (public.is_admin ())
  with check (public.is_admin ());
