-- =====================================================================
-- 027 - Fix: crear proyectos
-- ---------------------------------------------------------------------
-- 1) auto_assign_project_creator() seguia insertando 'gerente_proyecto'
--    despues de que 024 renombro el rol a 'director_proyecto'. El CHECK
--    de project_members rechaza el INSERT y todo el flujo de crear
--    proyecto se cae con "No se pudo crear el proyecto".
--
-- 2) La policy rls_insert_projects de 025 era DG-only. Segun la matriz
--    DG, DP y PL pueden crear proyectos. Para que DP/PL puedan crear
--    necesitan tener ya ese rol en algun otro proyecto (bootstrap lo
--    hace DG).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid())
  THEN
    INSERT INTO project_members (user_id, project_id, role)
    VALUES (auth.uid(), NEW.id, 'director_proyecto')
    ON CONFLICT (user_id, project_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "rls_insert_projects" ON public.projects;
CREATE POLICY "rls_insert_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role_anywhere(
    'director_proyecto', 'planificacion'
  ));
