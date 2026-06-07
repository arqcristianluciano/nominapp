-- Migration 077: Múltiples fotos por registro de bitácora
--
-- Objetivo: en lugar de un único photo_url en bitacora_entries, soportar
-- N fotos por registro a través de la tabla relacional bitacora_photos.
--
-- Compatibilidad: la columna photo_url se MANTIENE para que los registros
-- existentes sigan mostrando su foto. Al mismo tiempo se hace un backfill
-- automático: cada bitacora_entries con photo_url no nula recibe una fila
-- en bitacora_photos, de modo que la UI nueva solo consulta bitacora_photos.
--
-- RLS: espejo de las políticas de bitacora_entries:
--   SELECT  -> current_user_can_access_project(project_id via JOIN)
--   INSERT/UPDATE/DELETE -> user_has_capability(project_id, 'write_bitacora')
--
-- El bucket `bitacora-photos` ya existe (migración 043). No se toca.
-- Idempotente: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Tabla relacional bitacora_photos
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bitacora_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id  uuid        NOT NULL
                             REFERENCES public.bitacora_entries(id)
                             ON DELETE CASCADE,
  storage_path text        NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bitacora_photos IS
  'Fotos adicionales de un registro de bitácora. storage_path es la ruta '
  'dentro del bucket bitacora-photos. La columna photo_url en '
  'bitacora_entries se mantiene por compatibilidad con registros previos.';

COMMENT ON COLUMN public.bitacora_photos.storage_path IS
  'Path dentro del bucket bitacora-photos (e.g. <project_id>/...).';

-- Índice por clave foránea (evita seq-scan en cada JOIN)
CREATE INDEX IF NOT EXISTS idx_bitacora_photos_bitacora_id
  ON public.bitacora_photos (bitacora_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bitacora_photos ENABLE ROW LEVEL SECURITY;

-- Helper: dado un bitacora_photos.bitacora_id resuelve el project_id del entry padre.
-- Se define como STABLE SECURITY DEFINER para que las políticas RLS puedan
-- usarla sin disparar recursión en el contexto de autenticación.
CREATE OR REPLACE FUNCTION public._project_of_bitacora_photo(p_bitacora_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM public.bitacora_entries WHERE id = p_bitacora_id LIMIT 1;
$$;

-- SELECT: miembros del proyecto (o director general)
DROP POLICY IF EXISTS "rls_select_bitacora_photos" ON public.bitacora_photos;
CREATE POLICY "rls_select_bitacora_photos"
  ON public.bitacora_photos
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_can_access_project(
      public._project_of_bitacora_photo(bitacora_id)
    )
  );

-- INSERT: solo usuarios con capacidad write_bitacora en el proyecto
DROP POLICY IF EXISTS "rls_insert_bitacora_photos" ON public.bitacora_photos;
CREATE POLICY "rls_insert_bitacora_photos"
  ON public.bitacora_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_capability(
      public._project_of_bitacora_photo(bitacora_id),
      'write_bitacora'
    )
  );

-- UPDATE: idem
DROP POLICY IF EXISTS "rls_update_bitacora_photos" ON public.bitacora_photos;
CREATE POLICY "rls_update_bitacora_photos"
  ON public.bitacora_photos
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_capability(
      public._project_of_bitacora_photo(bitacora_id),
      'write_bitacora'
    )
  )
  WITH CHECK (
    public.user_has_capability(
      public._project_of_bitacora_photo(bitacora_id),
      'write_bitacora'
    )
  );

-- DELETE: idem
DROP POLICY IF EXISTS "rls_delete_bitacora_photos" ON public.bitacora_photos;
CREATE POLICY "rls_delete_bitacora_photos"
  ON public.bitacora_photos
  FOR DELETE
  TO authenticated
  USING (
    public.user_has_capability(
      public._project_of_bitacora_photo(bitacora_id),
      'write_bitacora'
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Backfill: migrar photo_url existentes a bitacora_photos
-- ──────────────────────────────────────────────────────────────────────────
-- Inserta una fila en bitacora_photos por cada bitacora_entries que ya tenga
-- photo_url. La condición NOT EXISTS hace la operación idempotente
-- (si se corre la migración dos veces no duplica).
INSERT INTO public.bitacora_photos (bitacora_id, storage_path, uploaded_at)
SELECT
  be.id           AS bitacora_id,
  be.photo_url    AS storage_path,
  be.created_at   AS uploaded_at
FROM public.bitacora_entries be
WHERE be.photo_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bitacora_photos bp
    WHERE bp.bitacora_id = be.id
      AND bp.storage_path = be.photo_url
  );

COMMIT;
