-- GadgetWise production foundation: identity, catalog, personal data, moderation, and AI quota.
-- Apply via Supabase CLI after reviewing against any existing remote schema.
begin;
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now(), primary key (user_id, role)
);
create or replace function public.has_role(required_role text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = required_role);
$$;
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to anon, authenticated;
create table if not exists public.categories (
  id text primary key, name text not null unique, description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.gadgets (
  id text primary key,
  category_id text not null references public.categories(id) on update cascade on delete restrict,
  brand text not null, model text not null, price numeric(12,2) not null check (price > 0),
  release_year integer check (release_year between 1990 and 2100), image_url text,
  summary text not null default '', specs jsonb not null default '{}'::jsonb,
  scored jsonb not null default '{}'::jsonb, value_data jsonb not null default '{}'::jsonb,
  data_source text not null default 'unverified', source_url text, price_verified_at timestamptz,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (brand, model)
);
create index if not exists gadgets_published_category_idx on public.gadgets (category_id, price) where is_published = true;
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  gadget_id text not null references public.gadgets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete set null, moderated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (gadget_id, user_id)
);
create index if not exists reviews_public_idx on public.reviews (gadget_id, created_at desc) where status = 'approved';
create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  gadget_id text not null references public.gadgets(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, gadget_id)
);
create table if not exists public.comparison_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gadget_ids text[] not null check (cardinality(gadget_ids) between 1 and 4),
  created_at timestamptz not null default now()
);
create index if not exists comparison_history_user_idx on public.comparison_history (user_id, created_at desc);
create table if not exists public.user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input jsonb not null default '{}'::jsonb, result_gadget_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0 check (request_count >= 0), primary key (user_id, usage_date)
);
create or replace function public.consume_ai_quota()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); new_count integer;
begin
  if caller_id is null then return false; end if;
  insert into public.ai_usage (user_id, usage_date, request_count)
  values (caller_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date) do update set request_count = public.ai_usage.request_count + 1
  returning request_count into new_count;
  return new_count <= 20;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_gadgetwise on auth.users;
create trigger on_auth_user_created_gadgetwise after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
drop trigger if exists gadgets_set_updated_at on public.gadgets;
create trigger gadgets_set_updated_at before update on public.gadgets for each row execute procedure public.set_updated_at();
drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews for each row execute procedure public.set_updated_at();
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.gadgets enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.comparison_history enable row level security;
alter table public.user_recommendations enable row level security;
alter table public.ai_usage enable row level security;
drop policy if exists "profile read own or admin" on public.profiles;
create policy "profile read own or admin" on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or public.has_role('admin'));
drop policy if exists "profile update own" on public.profiles;
create policy "profile update own" on public.profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "role read own or admin" on public.user_roles;
create policy "role read own or admin" on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or public.has_role('admin'));
drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "published categories readable" on public.categories;
create policy "published categories readable" on public.categories for select to anon, authenticated
using (is_published = true or public.has_role('admin'));
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "published gadgets readable" on public.gadgets;
create policy "published gadgets readable" on public.gadgets for select to anon, authenticated
using (is_published = true or public.has_role('admin'));
drop policy if exists "admins manage gadgets" on public.gadgets;
create policy "admins manage gadgets" on public.gadgets for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "approved reviews or own readable" on public.reviews;
create policy "approved reviews or own readable" on public.reviews for select to anon, authenticated
using (status = 'approved' or user_id = (select auth.uid()) or public.has_role('admin'));
drop policy if exists "users submit pending reviews" on public.reviews;
create policy "users submit pending reviews" on public.reviews for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending' and moderated_by is null and moderated_at is null);
drop policy if exists "users update own pending reviews or admins" on public.reviews;
create policy "users update own pending reviews or admins" on public.reviews for update to authenticated
using ((user_id = (select auth.uid()) and status = 'pending') or public.has_role('admin'))
with check ((user_id = (select auth.uid()) and status = 'pending') or public.has_role('admin'));
drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews for delete to authenticated using (public.has_role('admin'));
drop policy if exists "wishlist own rows" on public.wishlist_items;
create policy "wishlist own rows" on public.wishlist_items for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "comparison history own rows" on public.comparison_history;
create policy "comparison history own rows" on public.comparison_history for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "recommendations own rows" on public.user_recommendations;
create policy "recommendations own rows" on public.user_recommendations for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.ai_usage from anon, authenticated;
grant select on public.categories, public.gadgets, public.reviews to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.user_roles, public.wishlist_items,
  public.comparison_history, public.user_recommendations, public.categories, public.gadgets, public.reviews to authenticated;
commit;
