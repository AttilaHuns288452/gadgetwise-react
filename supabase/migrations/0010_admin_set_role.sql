-- 0010: admin-managed role changes (the one real role: admin_users membership).
--
-- The admin_users table intentionally has no INSERT/DELETE policies for client
-- roles, so role changes go through this single SECURITY DEFINER function:
--   - the CALLER must pass is_admin() (DB check, not a UI flag),
--   - an admin cannot remove their own access,
--   - the last remaining admin cannot be removed.
-- Execute is revoked from public/anon and granted to authenticated only; the
-- function body is the authorization boundary.

create or replace function public.admin_set_role(target_user_id uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if target_user_id is null then
    raise exception 'target user is required';
  end if;
  if make_admin then
    insert into public.admin_users (user_id, granted_by)
    values (target_user_id, 'admin-ui')
    on conflict (user_id) do nothing;
  else
    if target_user_id = auth.uid() then
      raise exception 'you cannot remove your own admin access';
    end if;
    if (select count(*) from public.admin_users) <= 1 then
      raise exception 'the last admin cannot be removed';
    end if;
    delete from public.admin_users where user_id = target_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_set_role(uuid, boolean) from public, anon;
grant execute on function public.admin_set_role(uuid, boolean) to authenticated;
