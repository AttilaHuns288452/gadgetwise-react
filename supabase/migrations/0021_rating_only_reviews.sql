-- 0021: rating-only reviews. A rating on its own is a valid review, so the
-- review write paths no longer reject an empty body. Empty bodies are stored
-- as null so "no text" stays distinguishable from empty-looking text.

create or replace function public.is_review_clean (p_body text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_norm text; v_phrase text; r record;
begin
  -- a blank body is clean: rating-only reviews are allowed
  if p_body is null or length(trim(p_body)) = 0 then return null; end if;
  v_norm := lower(p_body);
  v_norm := regexp_replace(v_norm, '[^[:alnum:]]+', ' ', 'g');
  v_norm := trim(regexp_replace(v_norm, '\s+', ' ', 'g'));
  for r in select phrase, category from public.forbidden_words where enabled loop
    v_phrase := lower(r.phrase);
    v_phrase := regexp_replace(v_phrase, '[^[:alnum:]]+', ' ', 'g');
    v_phrase := trim(regexp_replace(v_phrase, '\s+', ' ', 'g'));
    if v_phrase <> '' and v_norm ~ ('(^| )' || v_phrase || '( |$)') then
      return coalesce(r.category, 'general');
    end if;
  end loop;
  return null;
end;
$$;

create or replace function public.enforce_review_content () returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_norm text; v_phrase text; r record;
begin
  if auth.uid () is null then return new; end if;
  if public.is_admin () then return new; end if;
  -- rating-only reviews: nothing to screen when there is no text
  if new.body is null or length(trim(new.body)) = 0 then return new; end if;
  v_norm := lower(new.body);
  v_norm := regexp_replace(v_norm, '[^[:alnum:]]+', ' ', 'g');
  v_norm := trim(regexp_replace(v_norm, '\s+', ' ', 'g'));
  for r in select id, phrase, category from public.forbidden_words where enabled loop
    v_phrase := lower(r.phrase);
    v_phrase := regexp_replace(v_phrase, '[^[:alnum:]]+', ' ', 'g');
    v_phrase := trim(regexp_replace(v_phrase, '\s+', ' ', 'g'));
    if v_phrase <> '' and v_norm ~ ('(^| )' || v_phrase || '( |$)') then
      perform public.log_activity('review.rejected', 'review', new.id::text, 'rejected',
        'forbidden word matched (' || coalesce(r.category, 'general') || ')', jsonb_build_object('word_id', r.id, 'category', r.category));
      raise exception 'Your review contains language that is not allowed. Please edit it and try again.' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.submit_review (p_gadget_id text, p_rating integer, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_violation text; v_id uuid;
begin
  if auth.uid () is null then return jsonb_build_object('ok', false, 'error', 'You must be signed in to review.'); end if;
  v_violation := public.is_review_clean (p_body);
  if v_violation is not null then
    perform public.log_activity('review.rejected', 'review', coalesce(p_gadget_id, ''), 'rejected',
      'forbidden word matched (' || v_violation || ')', jsonb_build_object('category', v_violation));
    return jsonb_build_object('ok', false, 'error', 'Your review contains language that is not allowed. Please edit it and try again.');
  end if;
  insert into public.reviews (user_id, gadget_id, rating, body)
  values (auth.uid (), p_gadget_id, least(greatest(coalesce(p_rating, 5), 1), 5), nullif(trim(coalesce(p_body, '')), ''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id::text);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'Could not save your review. Please try again.');
end;
$$;

create or replace function public.edit_review_body (p_id uuid, p_rating integer, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_violation text; v_owner uuid;
begin
  select user_id into v_owner from public.reviews where id = p_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'error', 'Review not found.'); end if;
  -- reviews belong to their author: not even an admin may edit them
  if v_owner <> auth.uid () then return jsonb_build_object('ok', false, 'error', 'You can only edit your own reviews.'); end if;
  v_violation := public.is_review_clean (p_body);
  if v_violation is not null then
    perform public.log_activity('review.rejected', 'review', p_id::text, 'rejected',
      'forbidden word matched on edit (' || v_violation || ')', jsonb_build_object('category', v_violation));
    return jsonb_build_object('ok', false, 'error', 'Your review contains language that is not allowed. Please edit it and try again.');
  end if;
  update public.reviews set body = nullif(trim(coalesce(p_body, '')), ''), rating = least(greatest(coalesce(p_rating, rating), 1), 5) where id = p_id;
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'Could not save your changes. Please try again.');
end;
$$;

revoke all on function public.is_review_clean (text) from public, anon;
revoke all on function public.submit_review (text, integer, text) from public, anon;
revoke all on function public.edit_review_body (uuid, integer, text) from public, anon;
grant execute on function public.is_review_clean (text) to authenticated;
grant execute on function public.submit_review (text, integer, text) to authenticated;
grant execute on function public.edit_review_body (uuid, integer, text) to authenticated;
