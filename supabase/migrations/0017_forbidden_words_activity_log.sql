-- 0017: forbidden-word moderation + admin activity log.
--
-- Reviews are validated IN THE DATABASE so no client, API or admin path can
-- save a prohibited review around the front end. The forbidden list is
-- admin-managed and takes effect immediately (no redeploy).
--
-- Activity log is append-only: admins read it, only server-side code writes
-- it (trusted actor identity from auth.uid(), never from the request), and no
-- policy anywhere allows updating or deleting a logged event.

-- ---------------------------------------------------------------- tables

create table if not exists public.forbidden_words (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  category text not null default 'general',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

-- one entry per normalized phrase, case- and space-insensitive
create unique index if not exists forbidden_words_phrase_key
  on public.forbidden_words (lower(trim(phrase)));

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid,
  actor text,
  action text not null,
  entity_type text,
  entity_id text,
  result text not null default 'success',
  reason text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists activity_log_at_idx on public.activity_log (at desc);
create index if not exists activity_log_action_idx on public.activity_log (action);

-- ---------------------------------------------------------------- logging

-- Trusted logger: actor comes from the session, not the caller. Logging must
-- never break the action it describes, so errors are swallowed here (the
-- moderation path below is the opposite: it fails closed).
create or replace function public.log_activity (
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_result text default 'success',
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (actor_id, actor, action, entity_type, entity_id, result, reason, metadata)
  values (
    auth.uid(),
    (select u.email from auth.users u where u.id = auth.uid()),
    left(regexp_replace(coalesce(p_action, 'unknown'), '[\r\n]+', ' ', 'g'), 80),
    left(coalesce(p_entity_type, ''), 40),
    left(coalesce(p_entity_id, ''), 80),
    left(coalesce(p_result, 'success'), 12),
    left(regexp_replace(coalesce(p_reason, ''), '[\r\n]+', ' ', 'g'), 200),
    coalesce(p_metadata, '{}'::jsonb)
  );
exception when others then
  null;
end;
$$;

revoke all on function public.log_activity (text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.log_activity (text, text, text, text, text, jsonb) to authenticated, service_role;

-- Row-level log of admin table changes (products, categories, forbidden
-- words, roles, settings): fires only when the write actually commits.
create or replace function public.log_table_change () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_activity(
    lower(tg_op) || ' ' || tg_table_name,
    tg_table_name,
    -- any row shape: prefer id, fall back to key (app_settings has no id)
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key'),
    'success',
    null,
    jsonb_build_object('op', tg_op, 'table', tg_table_name)
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.log_table_change () from public, anon;
grant execute on function public.log_table_change () to authenticated, service_role;

-- Attach where the table exists (migrations are applied out of order on some
-- environments; a missing table must not fail the whole migration).
do $$
declare
  t text;
begin
  foreach t in array array['products', 'categories', 'forbidden_words', 'admin_users', 'site_settings', 'app_settings']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists log_%s_change on public.%I', t, t);
      execute format(
        'create trigger log_%s_change after insert or update or delete on public.%I for each row execute function public.log_table_change ()',
        t, t
      );
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------ review guard

-- The matcher: case-fold, strip punctuation/extra spaces on both sides, then
-- match the phrase as a whole word sequence. "bad-word" catches "bad word"
-- and "BAD  word!"; "bad" does not catch "embadword". Letter-separated
-- obfuscations (b.a.d.w.o.r.d) are a documented limitation.
create or replace function public.enforce_review_content () returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_phrase text;
  r record;
begin
  -- trusted writes (SQL editor / service role) are moderation's own tool
  if auth.uid () is null then
    return new;
  end if;
  if public.is_admin () then
    return new;
  end if;

  if new.body is null or length(trim(new.body)) = 0 then
    return new;
  end if;

  v_norm := lower(new.body);
  v_norm := regexp_replace(v_norm, '[^[:alnum:]]+', ' ', 'g');
  v_norm := trim(regexp_replace(v_norm, '\s+', ' ', 'g'));

  for r in select id, phrase, category from public.forbidden_words where enabled loop
    v_phrase := lower(r.phrase);
    v_phrase := regexp_replace(v_phrase, '[^[:alnum:]]+', ' ', 'g');
    v_phrase := trim(regexp_replace(v_phrase, '\s+', ' ', 'g'));
    if v_phrase <> '' and v_norm ~ ('(^| )' || v_phrase || '( |$)') then
      perform public.log_activity(
        'review.rejected', 'review', new.id::text, 'rejected',
        'forbidden word matched (' || coalesce(r.category, 'general') || ')',
        jsonb_build_object('word_id', r.id, 'category', r.category)
      );
      raise exception 'Your review contains language that is not allowed. Please edit it and try again.'
        using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_review_content () from public, anon;
grant execute on function public.enforce_review_content () to authenticated;

drop trigger if exists review_content_guard on public.reviews;
create trigger review_content_guard
  before insert or update of body on public.reviews
  for each row execute function public.enforce_review_content ();

-- Accepted / re-moderated reviews land in the log with their real status.
create or replace function public.log_review_event () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_activity(
    case when tg_op = 'INSERT' then 'review.submitted' else 'review.updated' end,
    'review', new.id::text, 'success', new.status,
    jsonb_build_object('status', new.status, 'gadget_id', new.gadget_id)
  );
  return new;
end;
$$;

revoke all on function public.log_review_event () from public, anon;
grant execute on function public.log_review_event () to authenticated, service_role;

drop trigger if exists review_log_event on public.reviews;
create trigger review_log_event
  after insert or update on public.reviews
  for each row execute function public.log_review_event ();

-- ------------------------------------------------------------ permissions

alter table public.forbidden_words enable row level security;
alter table public.activity_log enable row level security;

revoke all on public.forbidden_words from public, anon;
revoke all on public.activity_log from public, anon;
grant select, insert, update, delete on public.forbidden_words to authenticated;
grant select on public.activity_log to authenticated;

drop policy if exists "forbidden words admin all" on public.forbidden_words;
create policy "forbidden words admin all"
  on public.forbidden_words
  for all to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- append-only: admins read, nobody writes through PostgREST at all
drop policy if exists "activity log admin read" on public.activity_log;
create policy "activity log admin read"
  on public.activity_log
  for select to authenticated
  using (public.is_admin ());
