-- 0006: admin catalog management with real persistence.
-- The old admin had fake gadget/category CRUD (React state) and fabricated
-- analytics. This restores those features backed by real tables:
--   categories      — GadgetWise-owned catalog categories (admin CRUD)
--   products        — GadgetWise-curated products (admin CRUD, shown in catalog)
--   product_views   — real view tracking so analytics are counted, not invented
-- Writes are admin-only (is_admin(), security-definer). Reads are public for
-- categories/products (they appear on public pages); view rows are insert-only
-- for anyone (to count views) and admin-readable.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand text,
  model text not null,
  category text,
  price numeric,
  original_price numeric,
  image text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_views (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists product_views_product_idx on public.product_views (product_id, viewed_at);
create index if not exists products_category_idx on public.products (category);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_views enable row level security;

-- categories / products: public read (they render on public pages), admin write.
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);
drop policy if exists "admin write categories" on public.categories;
create policy "admin write categories" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);
drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- product_views: anyone may record a view (insert-only), only admins read.
drop policy if exists "anyone track product views" on public.product_views;
create policy "anyone track product views" on public.product_views for insert with check (true);
drop policy if exists "admin read product views" on public.product_views;
create policy "admin read product views" on public.product_views for select using (public.is_admin());
