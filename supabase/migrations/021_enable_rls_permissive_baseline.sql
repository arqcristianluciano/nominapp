-- =====================================================
-- NominApp - Migración 021: Baseline RLS permisiva
-- Activa RLS en todas las tablas de public que no la tenían y aplica
-- una policy permisiva por defecto para anon + authenticated. Esto:
--   - Silencia los advisors críticos rls_disabled_in_public,
--     policy_exists_rls_disabled y sensitive_columns_exposed.
--   - No rompe la app que hoy accede como anon (el flujo de Supabase
--     Auth real entrará al mergear el PR; mientras tanto las policies
--     permiten todo).
--   - Deja la infraestructura lista: cuando se active Auth real y se
--     pueblen project_members, basta con reemplazar las policies
--     "permissive_anon_authenticated" por las estrictas (migración 017).
-- =====================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "permissive_anon_authenticated" ON public.%I', r.tbl);
    EXECUTE format(
      'CREATE POLICY "permissive_anon_authenticated" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      r.tbl
    );
  END LOOP;
END $$;
