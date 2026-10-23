-- 0011: profile photo storage (Supabase Storage, owner-scoped).
--
-- Bucket 'avatars' is public-read (the photo renders on public reviewer pages)
-- with server-side type and size limits. Writes are restricted to the user's
-- OWN folder: every object name is <user_id>/<filename>, and the policies bind
-- folder[1] to auth.uid(), so one user can never overwrite another's photo.
-- The profile row stores only the resulting public URL (never image bytes).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar owner upload" on storage.objects;
create policy "avatar owner upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
