-- =====================================================================
-- 031 - Fix: trigger de project_members debe correr AFTER INSERT
-- ---------------------------------------------------------------------
-- En BEFORE INSERT, el row de projects todavia no esta en la tabla, asi
-- que cuando el trigger intenta meter al creador en project_members, la
-- FK project_members.project_id -> projects.id falla y todo el INSERT
-- se cae con "violates foreign key constraint project_members_project_id_fkey".
--
-- created_by ya tiene default auth.uid() en la columna, asi que tampoco
-- necesitamos forzarlo desde el trigger.
-- =====================================================================

DROP TRIGGER IF EXISTS trg_auto_assign_project_creator ON public.projects;

CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid())
  THEN
    INSERT INTO public.project_members (user_id, project_id, role)
    VALUES (auth.uid(), NEW.id, 'director_proyecto')
    ON CONFLICT (user_id, project_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_project_creator
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_project_creator();
