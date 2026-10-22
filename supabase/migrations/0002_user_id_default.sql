-- 0002: user_id must default to the authenticated user.
-- Root cause: `with check (auth.uid() = user_id)` rejected legitimate self-insert
-- because user_id had no default (null fails the check). Defaulting to auth.uid()
-- makes insert-without-user_id work while still rejecting a spoofed user_id.
-- Applies to every user-owned table.

alter table public.wishlist alter column user_id set default auth.uid ();
alter table public.comparison_history alter column user_id set default auth.uid ();
alter table public.reviews alter column user_id set default auth.uid ();

-- Same for profiles.id (signup trigger sets it, but default keeps insert safe).
alter table public.profiles alter column id set default auth.uid ();
