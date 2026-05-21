-- Migration 041: Add photo, geolocation and storage bucket to attendance_records.
--
-- Adds three new optional columns to `attendance_records`:
--   * photo_url   text  - public/signed URL to the worker's photo at check-in.
--   * latitude    numeric(10,7) - geolocation latitude captured by the browser.
--   * longitude   numeric(10,7) - geolocation longitude captured by the browser.
--
-- Also creates a private storage bucket `attendance_photos` with the same
-- per-user folder convention used by `user_documents`:
--   Object path MUST be `<user_uuid>/...`, enforced via
--   `(storage.foldername(name))[1] = auth.uid()::text`.

BEGIN;

-- 1) Add columns idempotently.
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS latitude  numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- 2) Private bucket for attendance photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance_photos', 'attendance_photos', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage RLS policies (bucket-scoped). RLS is already enabled on
--    storage.objects by Supabase; we only add bucket-scoped policies.

DROP POLICY IF EXISTS "attendance_photos_select_own_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "attendance_photos_insert_own_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "attendance_photos_delete_own_or_director"
  ON storage.objects;

-- SELECT: caller can read files inside their own folder, or any file in
-- the bucket if they are a director.
CREATE POLICY "attendance_photos_select_own_or_director"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attendance_photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

-- INSERT: caller can upload only into their own folder, directors anywhere.
CREATE POLICY "attendance_photos_insert_own_or_director"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance_photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

-- DELETE: caller can delete files in their own folder, directors anywhere.
CREATE POLICY "attendance_photos_delete_own_or_director"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attendance_photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

COMMIT;
