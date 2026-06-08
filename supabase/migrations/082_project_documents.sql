-- =====================================================================
-- NominApp - Migración 082: carpeta de documentos por proyecto
-- ---------------------------------------------------------------------
-- Crea la tabla `project_documents` para adjuntar planos, contratos,
-- permisos y cualquier otro archivo al proyecto.
-- También crea el bucket privado `project-documents` con el path
-- prefijado por <projectId> (primer segmento) y políticas RLS espejo
-- del patrón de receipt-attachments / bitacora-photos.
--
-- Capability elegida para escritura: 'edit_project'
--   Justificación: los documentos del proyecto (planos, contratos,
--   permisos) son archivos de gestión general del proyecto. La
--   capability 'edit_project' la tienen los roles con autoridad para
--   administrar el proyecto (director_proyecto y director_general).
--   Usar 'edit_project' mantiene coherencia con el resto de las
--   políticas de gestión del proyecto y evita crear una capability
--   nueva en la matriz de permisos.
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tabla project_documents
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL
                  REFERENCES public.projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  storage_path  text NOT NULL,
  doc_type      text NULL,
  size_bytes    bigint NULL,
  uploaded_by   text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_documents IS
  'Documentos (planos, contratos, permisos, etc.) adjuntos a un proyecto.';
COMMENT ON COLUMN public.project_documents.storage_path IS
  'Path dentro del bucket project-documents (e.g. <project_id>/<timestamp>-nombre.pdf).';
COMMENT ON COLUMN public.project_documents.doc_type IS
  'Categoría del documento: plano, contrato, permiso, otro, etc.';
COMMENT ON COLUMN public.project_documents.uploaded_by IS
  'Email o nombre del usuario que subió el archivo (snapshot en el momento de subida).';

-- Índice para listar documentos de un proyecto eficientemente.
CREATE INDEX IF NOT EXISTS project_documents_project_id_idx
  ON public.project_documents (project_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. RLS en la tabla project_documents
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier miembro con acceso al proyecto puede leer.
DROP POLICY IF EXISTS "project_documents_select_member" ON public.project_documents;
CREATE POLICY "project_documents_select_member" ON public.project_documents
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

-- INSERT: requiere capability 'edit_project' en el proyecto.
DROP POLICY IF EXISTS "project_documents_insert_editor" ON public.project_documents;
CREATE POLICY "project_documents_insert_editor" ON public.project_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_capability(project_id, 'edit_project'));

-- UPDATE: misma capability.
DROP POLICY IF EXISTS "project_documents_update_editor" ON public.project_documents;
CREATE POLICY "project_documents_update_editor" ON public.project_documents
  FOR UPDATE TO authenticated
  USING (public.user_has_capability(project_id, 'edit_project'))
  WITH CHECK (public.user_has_capability(project_id, 'edit_project'));

-- DELETE: misma capability.
DROP POLICY IF EXISTS "project_documents_delete_editor" ON public.project_documents;
CREATE POLICY "project_documents_delete_editor" ON public.project_documents
  FOR DELETE TO authenticated
  USING (public.user_has_capability(project_id, 'edit_project'));

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Bucket privado project-documents
-- ─────────────────────────────────────────────────────────────────────────

-- Límite de 50 MB por archivo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS en storage.objects para el bucket project-documents
--    Convención de path: <project_uuid>/<...>
-- ─────────────────────────────────────────────────────────────────────────

-- SELECT: cualquier miembro del proyecto puede descargar.
DROP POLICY IF EXISTS "project_documents_storage_select" ON storage.objects;
CREATE POLICY "project_documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.current_user_can_access_project(
      ((storage.foldername(name))[1])::uuid
    )
  );

-- INSERT: requiere capability 'edit_project'.
DROP POLICY IF EXISTS "project_documents_storage_insert" ON storage.objects;
CREATE POLICY "project_documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'edit_project'
    )
  );

-- UPDATE: misma capability.
DROP POLICY IF EXISTS "project_documents_storage_update" ON storage.objects;
CREATE POLICY "project_documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'edit_project'
    )
  )
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'edit_project'
    )
  );

-- DELETE: misma capability.
DROP POLICY IF EXISTS "project_documents_storage_delete" ON storage.objects;
CREATE POLICY "project_documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'edit_project'
    )
  );

COMMIT;
