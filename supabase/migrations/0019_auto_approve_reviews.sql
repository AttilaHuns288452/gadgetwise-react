-- 0019: reviews publish immediately; only their authors can delete them.
--
-- The forbidden-word guard (0017/0018) is the content gate - there is no
-- human approval queue. An explicit admin rejection still sticks (an edit
-- never changes publication state on its own).

create or replace function public.enforce_review_moderation ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid () is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- auto-approved on arrival; moderated_* stay null = no human in the loop
    new.status := 'approved';
    new.moderated_by := null;
    new.moderated_at := null;
    return new;
  end if;
  -- updates never change publication state on their own: an explicit admin
  -- rejection sticks, and a plain edit keeps whatever state the review had
  new.status := old.status;
  new.moderated_by := old.moderated_by;
  new.moderated_at := old.moderated_at;
  return new;
end;
$$;

drop policy if exists "reviews owner write" on public.reviews;
create policy "reviews owner write"
  on public.reviews for insert to authenticated
  with check (auth.uid () = user_id);

drop policy if exists "reviews owner delete" on public.reviews;
create policy "reviews owner delete"
  on public.reviews for delete to authenticated
  using (auth.uid () = user_id);

-- whatever was queued before becomes visible under the new policy
update public.reviews set status = 'approved' where status = 'pending';
