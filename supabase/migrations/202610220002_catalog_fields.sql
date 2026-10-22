-- Extend GadgetWise records to preserve the existing scoring/detail model.
begin;
alter table public.gadgets
  add column if not exists legacy_data jsonb not null default '{}'::jsonb,
  add column if not exists battery_hours numeric(7,2);

alter table public.categories
  add column if not exists file text;

-- A published record must carry a source URL and a complete finite scoring map.
-- Database validation prevents the admin UI from publishing half-entered products.
alter table public.gadgets
  drop constraint if exists gadgets_published_source_and_scores;
alter table public.gadgets
  add constraint gadgets_published_source_and_scores check (
    not is_published
    or (
      source_url is not null
      and source_url ~* '^https?://'
      and jsonb_typeof(scored -> 'performance') = 'number'
      and jsonb_typeof(scored -> 'battery') = 'number'
      and jsonb_typeof(scored -> 'durability') = 'number'
      and jsonb_typeof(scored -> 'portability') = 'number'
      and jsonb_typeof(scored -> 'display') = 'number'
      and jsonb_typeof(scored -> 'camera') = 'number'
      and jsonb_typeof(scored -> 'storage') = 'number'
      and jsonb_typeof(scored -> 'repairability') = 'number'
    )
  );
commit;
