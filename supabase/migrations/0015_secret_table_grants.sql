-- 0015: defense in depth for server-only tables.
--
-- catalog_cache (marketplace snapshots) and app_settings (encrypted provider
-- keys) are read and written exclusively by serverless functions using the
-- service role; nothing in the browser queries them. RLS already returned no
-- rows to other roles; this removes their queryable surface entirely.

revoke all on table public.catalog_cache from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;

grant select, insert, update, delete on table public.catalog_cache to service_role;
grant select, insert, update, delete on table public.app_settings to service_role;
