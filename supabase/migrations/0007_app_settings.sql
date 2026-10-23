-- 0007: admin-configurable app settings with encrypted secret storage.
--
-- The admin can set integration credentials (e.g. the Lazada API key) from the
-- console. Secrets are NEVER stored in plaintext: the value is encrypted with
-- AES-256-GCM using a master key held only in the server env
-- (SETTINGS_ENCRYPTION_KEY), so a DB leak alone cannot reveal a credential.
-- Writes require is_admin() (security-definer). Reads are admin-only too.
--
-- Threat note: this protects the value at rest in the DB. The master key lives
-- in the deployment env, so full protection still depends on env secrecy — the
-- same boundary as a plain env var, plus encryption at rest.

create table if not exists public.app_settings (
  key text primary key,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_settings enable row level security;

drop policy if exists "admin read settings" on public.app_settings;
create policy "admin read settings" on public.app_settings for select
  using (public.is_admin());

drop policy if exists "admin write settings" on public.app_settings;
create policy "admin write settings" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());
