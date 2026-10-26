-- 0018: moderation hardening + capture the review RPCs in the repo.
--
-- The review RPCs (is_review_clean / submit_review / edit_review_body) were
-- applied to the live database by hand; this migration is their source of
-- truth so a fresh environment can rebuild the same behavior. Fixes folded in
-- from the security audit:
--   * an approved review cannot be re-targeted to another product or
--     backdated without going back to moderation;
--   * empty review bodies are rejected at every layer;
--   * product view tracking cannot be backdated or pointed at junk ids;
--   * the audit logger is not callable by ordinary users;
--   * the dead reviews.moderation_status column is dropped;
--   * over-broad anon grants are revoked.

-- 1. moderation: re-pend when the reviewed PRODUCT or timestamp changes too
create or replace function public.enforce_review_moderation ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid () is null then
    return new;
  end if;
  if public.is_admin () then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.moderated_by := null;
    new.moderated_at := null;
    return new;
  end if;

  new.status := old.status;
  new.moderated_by := old.moderated_by;
  new.moderated_at := old.moderated_at;

  if old.status <> 'pending'
     and (new.rating is distinct from old.rating
          or new.body is distinct from old.body
          or new.gadget_id is distinct from old.gadget_id
          or new.created_at is distinct from old.created_at) then
    new.status := 'pending';
    new.moderated_by := null;
    new.moderated_at := null;
  end if;

  return new;
end;
$$;

-- 2. content guard: empty bodies are not reviews
create or replace function public.enforce_review_content ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_phrase text;
  r record;
begin
  if auth.uid () is null then
    return new;
  end if;
  if public.is_admin () then
    return new;
  end if;
  if new.body is null or length(trim(new.body)) = 0 then
    raise exception 'Your review cannot be empty.' using errcode = 'P0001';
  end if;

  v_norm := lower(new.body);
  v_norm := regexp_replace(v_norm, '[^[:alnum:]]+', ' ', 'g');
  v_norm := trim(regexp_replace(v_norm, '\s+', ' ', 'g'));

  for r in select id, phrase, category from public.forbidden_words where enabled loop
    v_phrase := lower(r.phrase);
    v_phrase := regexp_replace(v_phrase, '[^[:alnum:]]+', ' ', 'g');
    v_phrase := trim(regexp_replace(v_phrase, '\s+', ' ', 'g'));
    if v_phrase <> '' and v_norm ~ ('(^| )' || v_phrase || '( |$)') then
      perform public.log_activity('review.rejected', 'review', new.id::text, 'rejected',
        'forbidden word matched (' || coalesce(r.category, 'general') || ')',
        jsonb_build_object('word_id', r.id, 'category', r.category));
      raise exception 'Your review contains language that is not allowed. Please edit it and try again.' using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

-- 3. the review RPCs (single moderation service for the app's write paths)
create or replace function public.is_review_clean (p_body text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_norm text; v_phrase text; r record;
begin
  if p_body is null or length(trim(p_body)) = 0 then return 'empty'; end if;
  v_norm := lower(p_body);
  v_norm := regexp_replace(v_norm, '[^[:alnum:]]+', ' ', 'g');
  v_norm := trim(regexp_replace(v_norm, '\s+', ' ', 'g'));
  for r in select phrase, category from public.forbidden_words where enabled loop
    v_phrase := lower(r.phrase);
    v_phrase := regexp_replace(v_phrase, '[^[:alnum:]]+', ' ', 'g');
    v_phrase := trim(regexp_replace(v_phrase, '\s+', ' ', 'g'));
    if v_phrase <> '' and v_norm ~ ('(^| )' || v_phrase || '( |$)') then
      return coalesce(r.category, 'general');
    end if;
  end loop;
  return null;
end;
$$;

create or replace function public.submit_review (p_gadget_id text, p_rating integer, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_violation text; v_id uuid;
begin
  if auth.uid () is null then return jsonb_build_object('ok', false, 'error', 'You must be signed in to review.'); end if;
  if p_body is null or length(trim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Your review cannot be empty.');
  end if;
  v_violation := public.is_review_clean (p_body);
  if v_violation is not null then
    perform public.log_activity('review.rejected', 'review', coalesce(p_gadget_id, ''), 'rejected',
      'forbidden word matched (' || v_violation || ')', jsonb_build_object('category', v_violation));
    return jsonb_build_object('ok', false, 'error', 'Your review contains language that is not allowed. Please edit it and try again.');
  end if;
  insert into public.reviews (user_id, gadget_id, rating, body)
  values (auth.uid (), p_gadget_id, least(greatest(coalesce(p_rating, 5), 1), 5), p_body)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id::text);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'Could not save your review. Please try again.');
end;
$$;

create or replace function public.edit_review_body (p_id uuid, p_rating integer, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_violation text; v_owner uuid;
begin
  select user_id into v_owner from public.reviews where id = p_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'error', 'Review not found.'); end if;
  if v_owner <> auth.uid () and not public.is_admin () then
    return jsonb_build_object('ok', false, 'error', 'You can only edit your own reviews.');
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Your review cannot be empty.');
  end if;
  v_violation := public.is_review_clean (p_body);
  if v_violation is not null then
    perform public.log_activity('review.rejected', 'review', p_id::text, 'rejected',
      'forbidden word matched on edit (' || v_violation || ')', jsonb_build_object('category', v_violation));
    return jsonb_build_object('ok', false, 'error', 'Your review contains language that is not allowed. Please edit it and try again.');
  end if;
  update public.reviews set body = p_body, rating = least(greatest(coalesce(p_rating, rating), 1), 5) where id = p_id;
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'Could not save your changes. Please try again.');
end;
$$;

revoke all on function public.is_review_clean (text) from public, anon;
revoke all on function public.submit_review (text, integer, text) from public, anon;
revoke all on function public.edit_review_body (uuid, integer, text) from public, anon;
grant execute on function public.is_review_clean (text) to authenticated;
grant execute on function public.submit_review (text, integer, text) to authenticated;
grant execute on function public.edit_review_body (uuid, integer, text) to authenticated;

-- 4. the audit logger is only callable by trusted server code (its own
--    triggers run as the owner); ordinary users must not write audit rows
revoke execute on function public.log_activity (text, text, text, text, text, jsonb) from authenticated, anon, public;

-- 5. view tracking: server-stamped time, plausible product ids only
create or replace function public.guard_product_view () returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.viewed_at := now();
  if new.product_id is null or new.product_id !~ '^[A-Za-z0-9_-]{3,64}$' then
    raise exception 'invalid product' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_product_view () from public, anon;
grant execute on function public.guard_product_view () to authenticated, service_role, anon;

drop trigger if exists product_view_guard on public.product_views;
create trigger product_view_guard
  before insert on public.product_views
  for each row execute function public.guard_product_view ();

-- 6. dead column from 0003; 'status' is the live moderation gate
alter table public.reviews drop column if exists moderation_status;

-- 7. defence in depth: anon holds no privileges on private tables
revoke all on table public.profiles from anon, public;
revoke all on table public.admin_users from anon, public;
grant select, insert, update on table public.profiles to authenticated;
