-- =====================================================
-- NominApp - Migración 074: comprobante del ensayo de hormigón
-- -----------------------------------------------------
-- Permite adjuntar un comprobante (foto o PDF del resultado de laboratorio,
-- conduce de la concretera, etc.) a cada ensayo de control de calidad.
--
--   * Columna `comprobante_url` (opcional) en `quality_control`: guarda el
--     path del archivo dentro del bucket privado `quality-attachments`.
--   * Bucket privado `quality-attachments` con el path prefijado por
--     <projectId> (primer segmento) para que la RLS verifique el acceso:
--       - SELECT: cualquier miembro que pueda acceder al proyecto.
--       - INSERT/UPDATE/DELETE: quien tenga la capability 'write_quality'.
-- =====================================================

BEGIN;

-- 1) Columna opcional en quality_control (idempotente).
ALTER TABLE public.quality_control
  ADD COLUMN IF NOT EXISTS comprobante_url text;

COMMENT ON COLUMN public.quality_control.comprobante_url IS
  'Path dentro del bucket quality-attachments (e.g. <project_id>/...). NULL si el ensayo no tiene comprobante adjunto.';

-- 2) Bucket privado. ON CONFLICT DO NOTHING -> migración idempotente.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quality-attachments', 'quality-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Políticas RLS sobre storage.objects para el bucket quality-attachments.
--    Convención de path: primer segmento de carpeta = project_id (uuid).

DROP POLICY IF EXISTS "quality_attachments_select_member" ON storage.objects;
CREATE POLICY "quality_attachments_select_member" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quality-attachments'
    AND public.current_user_can_access_project(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "quality_attachments_insert_quality" ON storage.objects;
CREATE POLICY "quality_attachments_insert_quality" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quality-attachments'
    AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'write_quality')
  );

DROP POLICY IF EXISTS "quality_attachments_update_quality" ON storage.objects;
CREATE POLICY "quality_attachments_update_quality" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quality-attachments'
    AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'write_quality')
  )
  WITH CHECK (
    bucket_id = 'quality-attachments'
    AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'write_quality')
  );

DROP POLICY IF EXISTS "quality_attachments_delete_quality" ON storage.objects;
CREATE POLICY "quality_attachments_delete_quality" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quality-attachments'
    AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'write_quality')
  );

COMMIT;
