-- =====================================================
-- NominApp - Migración 055: bucket privado para conduces de recepción
-- -----------------------------------------------------
-- Bucket 'receipt-attachments' con el path prefijado por <projectId> (primer
-- segmento) para que RLS verifique pertenencia/permiso al proyecto:
--   - SELECT: cualquier miembro que pueda acceder al proyecto.
--   - INSERT/UPDATE/DELETE: quien tenga la capability 'receive_order'
--     (Almacenista) en ese proyecto.
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-attachments', 'receipt-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipt_attachments_select_member" ON storage.objects;
CREATE POLICY "receipt_attachments_select_member" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipt-attachments'
    AND current_user_can_access_project(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "receipt_attachments_insert_warehouse" ON storage.objects;
CREATE POLICY "receipt_attachments_insert_warehouse" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipt-attachments'
    AND user_has_capability(((storage.foldername(name))[1])::uuid, 'receive_order')
  );

DROP POLICY IF EXISTS "receipt_attachments_update_warehouse" ON storage.objects;
CREATE POLICY "receipt_attachments_update_warehouse" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipt-attachments'
    AND user_has_capability(((storage.foldername(name))[1])::uuid, 'receive_order')
  )
  WITH CHECK (
    bucket_id = 'receipt-attachments'
    AND user_has_capability(((storage.foldername(name))[1])::uuid, 'receive_order')
  );

DROP POLICY IF EXISTS "receipt_attachments_delete_warehouse" ON storage.objects;
CREATE POLICY "receipt_attachments_delete_warehouse" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipt-attachments'
    AND user_has_capability(((storage.foldername(name))[1])::uuid, 'receive_order')
  );
