-- Migration 040: Storage bucket and RLS policies for bitacora-photos
--
-- Creates a private storage bucket `bitacora-photos` where every project
-- member can upload pictures associated with a bitacora entry. Also adds
-- an optional `photo_url` column to `bitacora_entries` so the UI can keep
-- a stable reference (storage path) for the photo of each registro.
--
-- Convention:
--   Object path MUST be `<project_uuid>/<...>`, so the first folder
--   segment identifies the project. RLS enforces that the caller is
--   member of that project (or director general).

BEGIN;

-- 1) Add `photo_url` column on bitacora_entries (idempotent).
ALTER TABLE public.bitacora_entries
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.bitacora_entries.photo_url IS
  'Path dentro del bucket bitacora-photos (e.g. <project_id>/...). NULL si la entrada no tiene foto.';

-- 2) Private bucket. ON CONFLICT DO NOTHING makes the migration idempotent.
INSERT INTO storage.buckets (id, name, public)
VALUES ('bitacora-photos', 'bitacora-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 3) RLS policies on storage.objects scoped to bucket `bitacora-photos`.
--    Path convention: first folder segment = project_id (uuid).

DROP POLICY IF EXISTS "bitacora_photos_select_member_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "bitacora_photos_insert_member_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "bitacora_photos_update_member_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "bitacora_photos_delete_member_or_director"
  ON storage.objects;

-- SELECT: project members and directors can read any photo of the project.
CREATE POLICY "bitacora_photos_select_member_or_director"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bitacora-photos'
  AND public.current_user_can_access_project(
    ((storage.foldername(name))[1])::uuid
  )
);

-- INSERT: callers can upload only inside a project folder they belong to.
CREATE POLICY "bitacora_photos_insert_member_or_director"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bitacora-photos'
  AND public.user_has_capability(
    ((storage.foldername(name))[1])::uuid,
    'write_bitacora'
  )
);

-- UPDATE: same scope as insert (upsert/overwrite from the client).
CREATE POLICY "bitacora_photos_update_member_or_director"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bitacora-photos'
  AND public.user_has_capability(
    ((storage.foldername(name))[1])::uuid,
    'write_bitacora'
  )
)
WITH CHECK (
  bucket_id = 'bitacora-photos'
  AND public.user_has_capability(
    ((storage.foldername(name))[1])::uuid,
    'write_bitacora'
  )
);

-- DELETE: only users with write_bitacora capability on the project.
CREATE POLICY "bitacora_photos_delete_member_or_director"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bitacora-photos'
  AND public.user_has_capability(
    ((storage.foldername(name))[1])::uuid,
    'write_bitacora'
  )
);

COMMIT;
