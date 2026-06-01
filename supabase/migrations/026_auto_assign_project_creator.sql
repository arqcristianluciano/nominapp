-- =====================================================
-- NominApp - Migración 025: Auto-asignar creador del proyecto como miembro
--
-- Bug: `projects` permite INSERT a cualquier authenticated (no tiene
-- columna project_id, por lo que la migración 022 le aplicó la policy
-- permisiva `USING true WITH CHECK true`). Pero `budget_categories` y
-- el resto de tablas con project_id requieren ser director o miembro.
-- Resultado: un usuario crea un proyecto pero queda huérfano sin
-- miembros, y el siguiente paso (initializeForProject inserta las 23
-- partidas por defecto) falla con
-- "new row violates row-level security policy for table budget_categories".
--
-- Fix: trigger AFTER INSERT en projects que automáticamente inserta al
-- creador (auth.uid()) como project_member con rol 'gerente_proyecto'.
-- SECURITY DEFINER bypasea RLS para poder escribir en project_members
-- (cuya policy de escritura es sólo director).
--
-- Backfill: proyectos huérfanos (0 miembros) reciben acceso para los
-- usuarios estándar para que no queden inaccesibles.
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sólo intenta asignar si hay un auth.uid() y existe el perfil correspondiente.
  -- Evita romper la creación del proyecto por integridad referencial si el
  -- usuario aún no fue mapeado a user_profiles (caso bootstrap).
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN
    INSERT INTO project_members (user_id, project_id, role)
    VALUES (auth.uid(), NEW.id, 'gerente_proyecto')
    ON CONFLICT (user_id, project_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_project_creator ON public.projects;
CREATE TRIGGER trg_auto_assign_project_creator
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_project_creator();

-- Backfill: proyectos con cero miembros reciben automáticamente al
-- Administrador (director) como miembro para no quedar huérfanos.
-- Cada usuario adicional se asigna manualmente desde la app.
INSERT INTO project_members (user_id, project_id, role)
SELECT
  (SELECT id FROM user_profiles WHERE is_director = true ORDER BY created_at LIMIT 1),
  p.id,
  'gerente_proyecto'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id)
ON CONFLICT (user_id, project_id, role) DO NOTHING;
