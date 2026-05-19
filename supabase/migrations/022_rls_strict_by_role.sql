-- =====================================================
-- NominApp - Migración 022: RLS estricta por rol/proyecto
-- Reemplaza las policies permissive_anon_authenticated (baseline de la
-- migración 021) por policies estrictas que sólo permiten acceso a:
--   - Director General (current_user_is_director()), o
--   - Miembros del proyecto (project_members.user_id = auth.uid()).
-- Sólo aplica a authenticated; anon queda sin acceso (la app fuerza login
-- via Supabase Auth real).
-- Las tablas sin project_id (catálogos globales, audit, perfiles) reciben
-- policy authenticated-only sin filtro de proyecto.
-- Pre-requisito: tener al menos un user_profile con is_director=true,
-- creado vía el flujo de bootstrap del admin.
-- =====================================================

DO $$
DECLARE
  r record;
  has_project_id boolean;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relrowsecurity = true
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'project_id'
    ) INTO has_project_id;

    EXECUTE format('DROP POLICY IF EXISTS "permissive_anon_authenticated" ON public.%I', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "rls_strict_authenticated" ON public.%I', r.tbl);

    IF has_project_id THEN
      EXECUTE format(
        'CREATE POLICY "rls_strict_authenticated" ON public.%I
          FOR ALL TO authenticated
          USING (
            current_user_is_director()
            OR EXISTS (
              SELECT 1 FROM public.project_members pm
              WHERE pm.project_id = %I.project_id AND pm.user_id = auth.uid()
            )
          )
          WITH CHECK (
            current_user_is_director()
            OR EXISTS (
              SELECT 1 FROM public.project_members pm
              WHERE pm.project_id = %I.project_id AND pm.user_id = auth.uid()
            )
          )',
        r.tbl, r.tbl, r.tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "rls_strict_authenticated" ON public.%I
          FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        r.tbl
      );
    END IF;
  END LOOP;
END $$;
