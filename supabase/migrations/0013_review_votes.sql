-- 0013: review votes (public like / dislike on a review).
--
-- One vote per user per review (composite primary key), value is +1/-1.
-- Counts are public because they render on public review lists; the rows are
-- readable so a signed-in user can see their own vote state. Writes are
-- owner-only (RLS), so one user can never vote as another.

create table if not exists public.review_votes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_votes_review_idx on public.review_votes (review_id);

alter table public.review_votes enable row level security;

drop policy if exists "review votes public read" on public.review_votes;
create policy "review votes public read"
  on public.review_votes for select using (true);

drop policy if exists "review votes owner write" on public.review_votes;
create policy "review votes owner write"
  on public.review_votes for insert with check (auth.uid() = user_id);

drop policy if exists "review votes owner update" on public.review_votes;
create policy "review votes owner update"
  on public.review_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "review votes owner delete" on public.review_votes;
create policy "review votes owner delete"
  on public.review_votes for delete using (auth.uid() = user_id);
