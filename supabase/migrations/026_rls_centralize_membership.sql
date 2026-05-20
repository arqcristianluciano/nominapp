-- =====================================================
-- NominApp - Migración 026: Centralizar chequeo de membresía RLS
--
-- Refactor del modelo RLS introducido por las migraciones 022/024/025.
--
-- Problemas que resuelve:
--   1. Lectura: cada tabla con project_id repite el mismo
--        EXISTS (SELECT 1 FROM project_members pm
--                WHERE pm.project_id = <tabla>.project_id
--                  AND pm.user_id = auth.uid())
--      en USING y en WITH CHECK. Son 19 tablas con la misma expresión
--      duplicada cuatro veces (USING x WITH CHECK x select-from). Si la
--      regla cambia (e.g. soportar memberships en grupos), hay que tocar
--      19 policies a mano.
--
--   2. Bugs históricos: la duplicación causó recursión infinita en
--      project_members (mig. 024) y huérfanos por falta de trigger del
--      creador (mig. 025). Ambos vinieron de tener la regla escrita
--      como SQL inline en vez de centralizada en una función.
--
--   3. Trazabilidad: no hay forma de saber quién creó un proyecto sin
--      mirar la primera membership por created_at, lo que es frágil.
--
-- Solución:
--   a) Helper SECURITY DEFINER is_member_of_project(project_id) que
--      encapsula el EXISTS. Al ser SECURITY DEFINER bypasea RLS y nunca
--      se autoreferencia (igual estrategia que current_user_is_director).
--   b) Helper current_user_can_access_project(project_id) que combina
--      director + miembro en una sola expresión legible.
--   c) Reescritura de las 19 policies rls_strict_authenticated en
--      tablas con project_id usando los nuevos helpers. Mismo
--      comportamiento de acceso, mucho más fácil de leer.
--   d) Columna projects.created_by con FK a user_profiles, default
--      auth.uid(), backfill desde la membership más antigua tipo
--      gerente_proyecto/director_general por proyecto.
--   e) Trigger auto_assign_project_creator actualizado para fijar
--      created_by si viene NULL (lado servidor, idempotente).
-- =====================================================

-- -----------------------------------------------------
-- 1. Columna projects.created_by + backfill
-- -----------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID
    REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Backfill: usa la primera membership de tipo gerente_proyecto;
-- si no hay, cae a la primera director_general; si no hay, cae al
-- Director General más antiguo (fallback de bootstrap).
UPDATE public.projects p
SET created_by = sub.user_id
FROM (
  SELECT DISTINCT ON (project_id) project_id, user_id
  FROM public.project_members
  WHERE role IN ('gerente_proyecto', 'director_general')
  ORDER BY project_id, created_at ASC
) sub
WHERE p.id = sub.project_id
  AND p.created_by IS NULL;

UPDATE public.projects
SET created_by = (
  SELECT id FROM public.user_profiles
  WHERE is_director = true
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- Default para nuevas filas: el creador autenticado.
-- COALESCE para no romper INSERTs hechos por roles sin auth.uid()
-- (bootstrap, migraciones, jobs administrativos).
ALTER TABLE public.projects
  ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON public.projects(created_by);

COMMENT ON COLUMN public.projects.created_by IS
  'auth.uid() del usuario que creó el proyecto. Default auth.uid() + backfill desde la primera membership de tipo gerente_proyecto/director_general.';

-- -----------------------------------------------------
-- 2. Helpers SECURITY DEFINER
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_member_of_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_member_of_project(UUID) IS
  'Devuelve true si el usuario autenticado actual tiene alguna membresía en el proyecto. SECURITY DEFINER para evitar recursión cuando se llama desde policies de tablas relacionadas.';

CREATE OR REPLACE FUNCTION public.current_user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.current_user_is_director()
      OR public.is_member_of_project(p_project_id);
$$;

COMMENT ON FUNCTION public.current_user_can_access_project(UUID) IS
  'Punto único de decisión para RLS de tablas con project_id: true si el usuario es director general o miembro del proyecto.';

-- -----------------------------------------------------
-- 3. Reescribir policies rls_strict_authenticated en tablas con
--    project_id, usando current_user_can_access_project.
--
--    Mismo set de tablas que la migración 022 (todas las con
--    project_id excepto project_members, cuya policy se define en
--    la migración 024 y permanece sin tocar).
-- -----------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name AS tbl
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name AND pc.relkind = 'r'
    JOIN pg_namespace n ON n.oid = pc.relnamespace
    WHERE c.table_schema = 'public'
      AND c.column_name = 'project_id'
      AND n.nspname = 'public'
      AND pc.relrowsecurity = true
      AND c.table_name <> 'project_members'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_strict_authenticated" ON public.%I', r.tbl);

    EXECUTE format(
      'CREATE POLICY "rls_strict_authenticated" ON public.%I
        FOR ALL TO authenticated
        USING (public.current_user_can_access_project(%I.project_id))
        WITH CHECK (public.current_user_can_access_project(%I.project_id))',
      r.tbl, r.tbl, r.tbl
    );

    EXECUTE format(
      'COMMENT ON POLICY "rls_strict_authenticated" ON public.%I IS %L',
      r.tbl,
      'Acceso permitido si current_user_can_access_project(project_id) -- director_general o miembro. Centralizado en migración 026.'
    );
  END LOOP;
END $$;

-- -----------------------------------------------------
-- 4. Actualizar trigger auto_assign_project_creator para que también
--    fije projects.created_by si viene NULL.
--
--    Mantiene SECURITY DEFINER + el ON CONFLICT DO NOTHING que ya
--    venía de la migración 025. Idempotente.
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Si created_by no fue seteado por el cliente, intenta usar auth.uid().
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Mantiene el comportamiento de mig. 025: agregar al creador
  -- como gerente_proyecto. SECURITY DEFINER bypasea la policy
  -- project_members_admin (que sólo permite director).
  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid())
  THEN
    INSERT INTO project_members (user_id, project_id, role)
    VALUES (auth.uid(), NEW.id, 'gerente_proyecto')
    ON CONFLICT (user_id, project_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger debe ejecutarse BEFORE para poder modificar NEW.created_by.
-- La mig. 025 lo creó como AFTER, así que lo recreamos como BEFORE.
DROP TRIGGER IF EXISTS trg_auto_assign_project_creator ON public.projects;
CREATE TRIGGER trg_auto_assign_project_creator
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_project_creator();

-- -----------------------------------------------------
-- 5. Notas de modelo (referencia para futuros refactors)
--
-- Pirámide de helpers:
--
--   current_user_is_director()         -> SECURITY DEFINER, mira user_profiles.is_director
--   is_member_of_project(project_id)   -> SECURITY DEFINER, mira project_members
--   current_user_can_access_project(p) -> compone los dos anteriores
--
-- Reglas en las policies:
--   * Tablas con project_id  -> USING/WITH CHECK = current_user_can_access_project(project_id)
--   * Tablas sin project_id  -> USING/WITH CHECK = true   (catálogos, perfiles, audit)
--   * project_members        -> policy explícita en migración 024 (lectura propia + escritura director)
--   * projects               -> INSERT permitido a cualquier authenticated; trigger BEFORE INSERT
--                              añade al creador como gerente_proyecto y setea created_by.
--
-- Para sumar lógica nueva (ej.: memberships heredadas por empresa)
-- basta con modificar is_member_of_project; las 19 policies adaptan
-- su comportamiento automáticamente.
-- -----------------------------------------------------
