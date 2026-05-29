-- SQL script to initialize the 'avatars' storage bucket and its RLS policies
-- Run this in the Supabase SQL Editor

-- 1. Create the public 'avatars' bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB in bytes
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Delete existing policies to avoid conflicts
drop policy if exists "Allow public avatar view" on storage.objects;
drop policy if exists "Allow self avatar upload" on storage.objects;
drop policy if exists "Allow self avatar update" on storage.objects;
drop policy if exists "Allow self avatar delete" on storage.objects;

-- 3. Create RLS Policies
-- RLS Policy: Anyone can view any avatar in this public bucket
create policy "Allow public avatar view" on storage.objects
  for select using (bucket_id = 'avatars');

-- RLS Policy: Authenticated users can insert/upload files strictly into their own folder (folder name matches auth.uid()::text)
create policy "Allow self avatar upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS Policy: Authenticated users can update/overwrite their own files
create policy "Allow self avatar update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS Policy: Authenticated users can delete their own files
create policy "Allow self avatar delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
