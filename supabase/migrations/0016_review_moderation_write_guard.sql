-- 0016: review write-path guard — pending on insert, re-moderation on edit.
--
-- 0004 made moderation a real DB write, but its trigger guarded UPDATE only,
-- and the INSERT policy ("reviews owner write", inherited from 0001) checked
-- ownership alone. A client could therefore insert its own review already
-- 'approved' and publish it without a moderator ever seeing it. And because
-- 0004's trigger restored the old status on update, an author editing an
-- approved review kept it approved.
--
-- This migration closes both in the database:
--   1. a non-admin INSERT always lands as 'pending' — status, moderated_by and
--      moderated_at are server-owned, and the INSERT policy demands
--      status = 'pending' from everyone who is not an admin;
--   2. a non-admin who changes the body or the rating of a moderated review
--      sends it back to 'pending' for re-moderation.
--
-- Admins keep full control (approve / reject / edit) in the admin console:
-- is_admin() short-circuits the guard.
--
-- Scope: authenticated client writes. A write with no authenticated caller
-- (service role, SQL editor) is a trusted write and is left alone.

-- 0. The moderation columns this migration guards. 0003 added
--    moderated_by/moderated_at; make sure they exist so the trigger body can
--    never fail on a database that skipped 0003.
alter table public.reviews
  add column if not exists status text not null default 'pending',
  add column if not exists moderated_by uuid,
  add column if not exists moderated_at timestamptz;

-- 1. The guard itself. One function for INSERT and UPDATE, so the invariant
--    lives in a single place (0004's trigger is replaced with this body).
create or replace function public.enforce_review_moderation ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted write (service role / SQL editor): no authenticated caller, so
  -- there is no client to defend against.
  if auth.uid () is null then
    return new;
  end if;

  -- An admin is the moderator: approve / reject / edit stay theirs.
  if public.is_admin () then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A client may not publish itself. The moderation columns are
    -- server-owned: the row enters the moderation queue as pending.
    new.status := 'pending';
    new.moderated_by := null;
    new.moderated_at := null;
    return new;
  end if;

  -- UPDATE by the author: the moderation columns are not theirs to change.
  new.status := old.status;
  new.moderated_by := old.moderated_by;
  new.moderated_at := old.moderated_at;

  -- An edit invalidates the moderation decision: edited text or rating goes
  -- back into the queue instead of staying published.
  if old.status <> 'pending'
     and (new.rating is distinct from old.rating or new.body is distinct from old.body) then
    new.status := 'pending';
    new.moderated_by := null;
    new.moderated_at := null;
  end if;

  return new;
end;
$$;

-- 2. The triggers. 0004's UPDATE trigger is recreated against the new body;
--    the INSERT trigger is new.
drop trigger if exists review_moderation_guard on public.reviews;
create trigger review_moderation_guard
  before update on public.reviews
  for each row execute function public.enforce_review_moderation ();

drop trigger if exists review_moderation_insert_guard on public.reviews;
create trigger review_moderation_insert_guard
  before insert on public.reviews
  for each row execute function public.enforce_review_moderation ();

-- 3. Policy backstop. The trigger rewrites the row before the WITH CHECK
--    runs, so a client that asks for 'approved' already arrives as
--    'pending'. This policy is the second layer: if the trigger is ever
--    dropped, the insert is still rejected.
drop policy if exists "reviews owner write" on public.reviews;
create policy "reviews owner write"
  on public.reviews for insert
  with check (
    auth.uid () = user_id
    and (public.is_admin () or status = 'pending')
  );

-- 4. Convention (see 0010): a definer function is not callable by the public
--    roles. It is only ever invoked by its trigger.
revoke all on function public.enforce_review_moderation () from public, anon;
grant execute on function public.enforce_review_moderation () to authenticated;
