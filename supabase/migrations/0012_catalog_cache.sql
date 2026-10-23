-- 0012: shared catalog snapshot cache (service-role only).
--
-- The marketplace feed is quota-metered (a handful of requests per month), so a
-- cold browser can exhaust it and leave the catalog empty. The search handler
-- writes each successful category response here and serves it when the provider
-- is unavailable: real, previously-fetched marketplace data with a timestamp —
-- never fabricated rows, and the caller is told the response is stale.
--
-- No client policies: only the serverless handler (service role) reads/writes.

create table if not exists public.catalog_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.catalog_cache enable row level security;
