-- Tighten publish-time validation and make daily AI quota enforcement bounded.
begin;

alter table public.gadgets
  drop constraint if exists gadgets_published_source_and_scores;

alter table public.gadgets
  add constraint gadgets_published_source_and_scores check (
    not is_published
    or (
      source_url is not null
      and source_url ~* '^https?://'
      and price_verified_at is not null
      and data_source = 'admin_verified'
      and (case when jsonb_typeof(scored -> 'performance') = 'number' then (scored ->> 'performance')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'battery') = 'number' then (scored ->> 'battery')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'durability') = 'number' then (scored ->> 'durability')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'portability') = 'number' then (scored ->> 'portability')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'display') = 'number' then (scored ->> 'display')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'camera') = 'number' then (scored ->> 'camera')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'storage') = 'number' then (scored ->> 'storage')::numeric between 0 and 10 else false end)
      and (case when jsonb_typeof(scored -> 'repairability') = 'number' then (scored ->> 'repairability')::numeric between 0 and 10 else false end)
    )
  );

create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_count integer;
  today_utc date := (now() at time zone 'utc')::date;
begin
  if caller_id is null then
    return false;
  end if;

  insert into public.ai_usage (user_id, usage_date, request_count)
  values (caller_id, today_utc, 1)
  on conflict (user_id, usage_date)
  do update set request_count = public.ai_usage.request_count + 1
  where public.ai_usage.request_count < 20
  returning request_count into new_count;

  -- If the user's counter is already at the limit, ON CONFLICT returns no row.
  return coalesce(new_count <= 20, false);
end;
$$;

revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;

commit;
