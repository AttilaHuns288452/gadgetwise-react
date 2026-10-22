-- 0004: real review moderation + admin moderation policies.
-- Adds a moderation status to reviews so approve/reject is a genuine DB write
-- (not React state), and enforces it in the database so a review author cannot
-- self-approve (the policy layer owns the invariant, per security best practice).

alter table public.reviews
  add column if not exists status text not null default 'pending';

do $$ begin
  alter table public.reviews
    add constraint reviews_status_check check (status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

-- Existing reviews predate moderation; approve them so none disappear publicly.
update public.reviews set status = 'approved' where status = 'pending' and created_at < now();

create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

-- Admin check (security definer, defined in 0003). Reuse it here.
-- Public sees approved reviews, plus their own (any status), plus admins see all.
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read"
  on public.reviews for select
  using (
    status = 'approved'
    or auth.uid () = user_id
    or public.is_admin ()
  );

-- Authors may edit their own review body/rating but may NOT change its status.
-- A trigger below enforces this; the policy just scopes ownership.
drop policy if exists "reviews owner update" on public.reviews;
create policy "reviews owner update"
  on public.reviews for update
  using (auth.uid () = user_id or public.is_admin ())
  with check (auth.uid () = user_id or public.is_admin ());

drop policy if exists "reviews owner delete" on public.reviews;
create policy "reviews owner delete"
  on public.reviews for delete
  using (auth.uid () = user_id or public.is_admin ());

-- Invariant: only an admin can change status. Authors keep the status they had.
create or replace function public.enforce_review_moderation ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin () then
    new.status := old.status; // non-admin edits cannot flip moderation state
  end if;
  return new;
end;
$$;

drop trigger if exists review_moderation_guard on public.reviews;
create trigger review_moderation_guard
  before update on public.reviews
  for each row execute function public.enforce_review_moderation ();
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
