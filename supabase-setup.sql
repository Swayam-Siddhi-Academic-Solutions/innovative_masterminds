-- Innovative Masterminds Gallery – Supabase one-time setup
-- Run this entire script in Supabase Dashboard > SQL Editor.
--
-- Admin email used by the website:
--   im.abhilash.ssas@gmail.com
--
-- IMPORTANT:
-- Create an Auth user with that exact email in Authentication > Users.
-- Do not put any service_role / secret key in GitHub.

-- 1) Create (or update) a PUBLIC storage bucket.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gallery',
  'gallery',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Remove policies with the same names if re-running this setup.
drop policy if exists "Public can list gallery media" on storage.objects;
drop policy if exists "Admin can upload gallery media" on storage.objects;
drop policy if exists "Admin can delete gallery media" on storage.objects;
drop policy if exists "Admin can update gallery media" on storage.objects;

-- 3) Anyone can LIST objects in this specific public gallery bucket.
-- Public buckets already allow direct serving of files; this SELECT policy
-- is needed so the website can list the files for the gallery grid.
create policy "Public can list gallery media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'gallery');

-- 4) Only the authenticated admin email can UPLOAD.
create policy "Admin can upload gallery media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'im.abhilash.ssas@gmail.com'
);

-- 5) Only the authenticated admin email can DELETE.
create policy "Admin can delete gallery media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'im.abhilash.ssas@gmail.com'
);

-- 6) Optional update permission for future file replacement features.
create policy "Admin can update gallery media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gallery'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'im.abhilash.ssas@gmail.com'
)
with check (
  bucket_id = 'gallery'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'im.abhilash.ssas@gmail.com'
);
