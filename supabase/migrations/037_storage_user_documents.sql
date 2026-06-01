-- Migration 034: Storage bucket and RLS policies for user_documents
--
-- Creates a private storage bucket `user_documents` where each user can only
-- access objects placed under their own UID folder (e.g. `<auth.uid()>/...`).
-- Directors (current_user_is_director() = true) get full access to all
-- objects in the bucket.
--
-- Convention:
--   Object path MUST be `<user_uuid>/<...>`, so the first folder segment
--   identifies the owner. We enforce this via
--   `(storage.foldername(name))[1] = auth.uid()::text`.

BEGIN;

-- 1) Private bucket. ON CONFLICT DO NOTHING makes the migration idempotent.
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_documents', 'user_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2) RLS policies on storage.objects.
--    RLS is already enabled on storage.objects by Supabase; we only add
--    bucket-scoped policies.

DROP POLICY IF EXISTS "user_documents_select_own_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "user_documents_insert_own_or_director"
  ON storage.objects;
DROP POLICY IF EXISTS "user_documents_delete_own_or_director"
  ON storage.objects;

-- SELECT: caller can read files inside their own folder, or any file in
-- the bucket if they are a director.
CREATE POLICY "user_documents_select_own_or_director"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

-- INSERT: caller can upload only into their own folder, directors anywhere.
CREATE POLICY "user_documents_insert_own_or_director"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

-- DELETE: caller can delete files in their own folder, directors anywhere.
CREATE POLICY "user_documents_delete_own_or_director"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_director()
  )
);

COMMIT;
