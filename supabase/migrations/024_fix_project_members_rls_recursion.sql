-- =====================================================
-- NominApp - Migración 024: Arreglar recursión infinita en RLS de project_members
--
-- La migración 022 aplicó la policy "rls_strict_authenticated" a todas las
-- tablas con columna project_id, incluyendo project_members. La policy hace
--   EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = X.project_id
--           AND pm.user_id = auth.uid())
-- Para la propia tabla project_members, ese SELECT vuelve a activar la policy,
-- creando recursión infinita ("infinite recursion detected in policy for
-- relation 'project_members'"). Esa recursión también rompe el EXISTS dentro
-- de las policies de las demás tablas, así que termina bloqueando todas las
-- consultas (budget_categories, budget_items, projects, etc.).
--
-- Solución:
--   1. Convertir los helpers current_user_is_director y current_user_has_role
--      en SECURITY DEFINER para que evalúen sin pasar por RLS.
--   2. Reemplazar la policy de project_members por una NO recursiva:
--      lectura para director_general o el dueño de la fila; escritura sólo
--      para director_general.
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_user_is_director()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT is_director FROM user_profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(p_project_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE user_id = auth.uid()
      AND project_id = p_project_id
      AND role = ANY(p_roles)
  );
$$;

DROP POLICY IF EXISTS "rls_strict_authenticated" ON public.project_members;

CREATE POLICY "project_members_read" ON public.project_members
  FOR SELECT TO authenticated
  USING (current_user_is_director() OR user_id = auth.uid());

CREATE POLICY "project_members_admin" ON public.project_members
  FOR ALL TO authenticated
  USING (current_user_is_director())
  WITH CHECK (current_user_is_director());
