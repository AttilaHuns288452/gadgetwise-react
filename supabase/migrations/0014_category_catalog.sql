-- 0014: categories drive the marketplace catalog.
--
-- The category list used to be decorative: the public catalog fetched a
-- hardcoded query per category while the admin-managed `categories` table fed
-- nothing. Now a category row owns:
--   slug  -> the app's category id (filters, product.category, quiz cases)
--   name  -> the public label
--   query -> the marketplace search keyword that fills the category
-- Renaming updates the public site; changing the query changes what is
-- fetched; adding a row adds a category with products.

alter table public.categories
  add column if not exists slug text,
  add column if not exists query text;

-- backfill slugs for existing rows so they keep matching app category ids
update public.categories
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

create unique index if not exists categories_slug_idx on public.categories (slug);
