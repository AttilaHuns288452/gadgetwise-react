-- 0008: persisted recommendation runs.
-- A run stores the user's answers and the ranked product ids/titles produced by
-- the deterministic recommendation engine. Product facts are re-read from the
-- current catalog when a run is opened, so this is history, not a stale product
-- snapshot or a second product authority.

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  category text not null,
  budget_label text not null,
  use_case text not null,
  priorities jsonb not null default '{}'::jsonb,
  result_ids text[] not null default '{}',
  result_titles text[] not null default '{}',
  result_scores numeric[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists recommendation_history_user_idx
  on public.recommendation_history (user_id, created_at desc);

alter table public.recommendation_history enable row level security;

drop policy if exists "recommendation history owner read" on public.recommendation_history;
create policy "recommendation history owner read"
  on public.recommendation_history for select using (auth.uid() = user_id);

drop policy if exists "recommendation history owner write" on public.recommendation_history;
create policy "recommendation history owner write"
  on public.recommendation_history for insert with check (auth.uid() = user_id);

drop policy if exists "recommendation history owner delete" on public.recommendation_history;
create policy "recommendation history owner delete"
  on public.recommendation_history for delete using (auth.uid() = user_id);
