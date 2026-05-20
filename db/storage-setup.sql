-- SQL script to initialize bucket and policies in Supabase
-- Run this in the Supabase SQL Editor

-- Create the private bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-ids', 
  'user-ids', 
  false, 
  26214400, -- 25MB in bytes
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Create Policies
-- Note: These policies assume the folder structure ids/{userId}/filename.ext
-- RLS is typically enabled by default on storage.objects in Supabase.
-- If it is not enabled, please enable it via the Supabase Dashboard UI (Storage -> Settings).

drop policy if exists "Allow self-upload" on storage.objects;
create policy "Allow self-upload" on storage.objects
  for insert with check (
    bucket_id = 'user-ids' 
    and (storage.foldername(name))[1] = 'ids'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "Allow self-view" on storage.objects;
create policy "Allow self-view" on storage.objects
  for select using (
    bucket_id = 'user-ids'
    and (storage.foldername(name))[1] = 'ids'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "Allow Super Admin view all" on storage.objects;
create policy "Allow Super Admin view all" on storage.objects
  for select using (
    bucket_id = 'user-ids'
    and auth.jwt() -> 'app_metadata' ->> 'role' = 'cdrrmo_super_admin'
  );
