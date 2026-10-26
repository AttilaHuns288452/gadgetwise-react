-- 0020: reviews are author-only — admins can read but never edit or delete.

create or replace function public.edit_review_body (p_id uuid, p_rating integer, p_body text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_violation text; v_owner uuid;
begin
  select user_id into v_owner from public.reviews where id = p_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'error', 'Review not found.'); end if;
  -- reviews belong to their author: not even an admin may edit them
  if v_owner <> auth.uid () then return jsonb_build_object('ok', false, 'error', 'You can only edit your own reviews.'); end if;
  if p_body is null or length(trim(p_body)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Your review cannot be empty.');
  end if;
  v_violation := public.is_review_clean (p_body);
  if v_violation is not null then
    perform public.log_activity('review.rejected', 'review', p_id::text, 'rejected',
      'forbidden word matched on edit (' || v_violation || ')', jsonb_build_object('category', v_violation));
    return jsonb_build_object('ok', false, 'error', 'Your review contains language that is not allowed. Please edit it and try again.');
  end if;
  update public.reviews set body = p_body, rating = least(greatest(coalesce(p_rating, rating), 1), 5) where id = p_id;
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'Could not save your changes. Please try again.');
end;
$$;

-- no admin path to review updates at all
drop policy if exists "reviews admin moderate" on public.reviews;
drop policy if exists "reviews owner update" on public.reviews;
create policy "reviews owner update"
  on public.reviews for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);
