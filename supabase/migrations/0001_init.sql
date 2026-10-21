-- GadgetWise: user-owned data with Row Level Security.
-- Run in the Supabase SQL editor, or `supabase db push`.
-- Order: run this before any code that writes to these tables.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by owner" on public.profiles;
create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid () = id);

drop policy if exists "profiles are insertable by owner" on public.profiles;
create policy "profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid () = id);

drop policy if exists "profiles are updatable by owner" on public.profiles;
create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid () = id)
  with check (auth.uid () = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- ---------- wishlist ----------
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  gadget_id text not null,
  gadget_title text,
  created_at timestamptz not null default now(),
  unique (user_id, gadget_id)
);

create index if not exists wishlist_user_idx on public.wishlist (user_id);

alter table public.wishlist enable row level security;

drop policy if exists "wishlist owner read" on public.wishlist;
create policy "wishlist owner read"
  on public.wishlist for select using (auth.uid () = user_id);

drop policy if exists "wishlist owner write" on public.wishlist;
create policy "wishlist owner write"
  on public.wishlist for insert with check (auth.uid () = user_id);

drop policy if exists "wishlist owner update" on public.wishlist;
create policy "wishlist owner update"
  on public.wishlist for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

drop policy if exists "wishlist owner delete" on public.wishlist;
create policy "wishlist owner delete"
  on public.wishlist for delete using (auth.uid () = user_id);

-- ---------- comparison history ----------
create table if not exists public.comparison_history (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  gadget_ids text[] not null,
  gadget_titles text[],
  created_at timestamptz not null default now()
);

create index if not exists comparison_history_user_idx on public.comparison_history (user_id);

alter table public.comparison_history enable row level security;

drop policy if exists "comparison history owner read" on public.comparison_history;
create policy "comparison history owner read"
  on public.comparison_history for select using (auth.uid () = user_id);

drop policy if exists "comparison history owner write" on public.comparison_history;
create policy "comparison history owner write"
  on public.comparison_history for insert with check (auth.uid () = user_id);

drop policy if exists "comparison history owner delete" on public.comparison_history;
create policy "comparison history owner delete"
  on public.comparison_history for delete using (auth.uid () = user_id);

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  gadget_id text not null,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_user_idx on public.reviews (user_id);
create index if not exists reviews_gadget_idx on public.reviews (gadget_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read"
  on public.reviews for select using (true);

drop policy if exists "reviews owner write" on public.reviews;
create policy "reviews owner write"
  on public.reviews for insert with check (auth.uid () = user_id);

drop policy if exists "reviews owner update" on public.reviews;
create policy "reviews owner update"
  on public.reviews for update using (auth.uid () = user_id) with check (auth.uid () = user_id);

drop policy if exists "reviews owner delete" on public.reviews;
create policy "reviews owner delete"
  on public.reviews for delete using (auth.uid () = user_id);
