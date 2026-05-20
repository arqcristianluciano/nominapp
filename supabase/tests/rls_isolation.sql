-- =====================================================
-- NominApp - Smoke tests de aislamiento RLS
--
-- Verifica que el modelo de policies introducido por la migración 026
-- (helpers is_member_of_project + current_user_can_access_project)
-- mantiene aislamiento entre proyectos.
--
-- Cómo ejecutar:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
--
-- o vía MCP / Supabase SQL editor: pega el contenido completo. Cada
-- aserción levanta una EXCEPTION si falla, así que la ejecución entera
-- aborta apenas algo no cuadra.
--
-- IMPORTANT: los IDs hardcodeados abajo son del proyecto de prod
--   pkllcsexipdvwdpunlkz. Si se siembra la base de cero, hay que
--   actualizar los UUIDs.
-- =====================================================

DO $$
DECLARE
  -- Usuarios
  v_director       UUID := 'fc840753-aabf-4326-a4b9-10875274d76f'; -- Administrador (is_director=true)
  v_planificacion  UUID := '179b047f-5fbf-4ae4-958e-0b886cb5de41'; -- Planificación (miembro POA/PCE/AQ2, NO miembro de KUBOO)

  -- Proyectos
  v_poa            UUID := '0e65a64b-9167-44b7-96ce-4877af9dd5cf'; -- POA-2026 OMAR AYBAR (Planificación es miembro)
  v_kuboo          UUID := '3cc4e38b-9900-491e-a3f8-2d94ae1f0ccf'; -- KUBOO (sólo Administrador es miembro)

  v_count          INTEGER;
BEGIN
  -- =================================================================
  -- ASSERT 0: el seed de prueba está intacto. Si esto falla, los UUIDs
  -- de arriba ya no son válidos y el resto del test es ruido.
  -- =================================================================
  PERFORM 1 FROM public.user_profiles WHERE id = v_director AND is_director = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'precondición rota: el usuario director % no existe o no es is_director', v_director;
  END IF;

  PERFORM 1 FROM public.user_profiles WHERE id = v_planificacion AND is_director = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'precondición rota: el usuario planificación % no existe o es director', v_planificacion;
  END IF;

  PERFORM 1 FROM public.project_members WHERE user_id = v_planificacion AND project_id = v_poa;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'precondición rota: planificación % no es miembro de POA %', v_planificacion, v_poa;
  END IF;

  PERFORM 1 FROM public.project_members WHERE user_id = v_planificacion AND project_id = v_kuboo;
  IF FOUND THEN
    RAISE EXCEPTION 'precondición rota: planificación % es miembro de KUBOO % (debería NO serlo para testear aislamiento)', v_planificacion, v_kuboo;
  END IF;

  RAISE NOTICE 'OK [precondiciones] director=%, planificación=%, POA=%, KUBOO=%', v_director, v_planificacion, v_poa, v_kuboo;

  -- =================================================================
  -- ASSERT 1: como Planificación (miembro de POA) ve budget_categories de POA.
  -- =================================================================
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_planificacion), true);
  SET LOCAL ROLE authenticated;

  SELECT COUNT(*) INTO v_count
  FROM public.budget_categories
  WHERE project_id = v_poa;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL [assert 1]: planificación NO ve budget_categories de POA (esperaba >0, obtuvo %)', v_count;
  END IF;
  RAISE NOTICE 'OK [assert 1]: planificación ve % budget_categories de POA', v_count;

  -- =================================================================
  -- ASSERT 2: como Planificación NO ve budget_categories de KUBOO
  -- (no es miembro).
  -- =================================================================
  SELECT COUNT(*) INTO v_count
  FROM public.budget_categories
  WHERE project_id = v_kuboo;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [assert 2]: aislamiento roto. Planificación ve % budget_categories de KUBOO (esperaba 0)', v_count;
  END IF;
  RAISE NOTICE 'OK [assert 2]: planificación NO ve budget_categories de KUBOO (count=0)';

  -- =================================================================
  -- ASSERT 3: como Planificación, INSERT en KUBOO debe fallar
  -- (RLS WITH CHECK rechaza la fila).
  -- =================================================================
  BEGIN
    INSERT INTO public.budget_categories (project_id, code, name, sort_order)
    VALUES (v_kuboo, 'TEST-RLS', 'should fail', 999);
    -- si el INSERT no falla, levanta error explícito
    RAISE EXCEPTION 'FAIL [assert 3]: aislamiento roto. Planificación pudo INSERT en KUBOO';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'OK [assert 3]: INSERT de planificación en KUBOO rechazado por RLS';
    WHEN OTHERS THEN
      IF SQLSTATE LIKE '42%' OR SQLERRM LIKE '%row-level security%' OR SQLERRM LIKE '%violates row-level security%' THEN
        RAISE NOTICE 'OK [assert 3]: INSERT de planificación en KUBOO rechazado (% / %)', SQLSTATE, SQLERRM;
      ELSE
        RAISE EXCEPTION 'FAIL [assert 3]: error inesperado al intentar INSERT: % / %', SQLSTATE, SQLERRM;
      END IF;
  END;

  -- =================================================================
  -- ASSERT 4: como Director, ve budget_categories de ambos proyectos.
  -- =================================================================
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_director), true);

  SELECT COUNT(*) INTO v_count
  FROM public.budget_categories
  WHERE project_id = v_poa;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL [assert 4a]: director NO ve budget_categories de POA (esperaba >0)';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.budget_categories
  WHERE project_id = v_kuboo;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL [assert 4b]: director NO ve budget_categories de KUBOO (esperaba >0)';
  END IF;

  RAISE NOTICE 'OK [assert 4]: director ve budget_categories de POA y KUBOO';

  -- =================================================================
  -- ASSERT 5: como Director ve los 4 proyectos completos.
  -- =================================================================
  SELECT COUNT(*) INTO v_count FROM public.projects;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'FAIL [assert 5]: director ve sólo % proyectos (esperaba >=4)', v_count;
  END IF;
  RAISE NOTICE 'OK [assert 5]: director ve % proyectos', v_count;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);

  -- =================================================================
  -- ASSERT 6: como anónimo (role anon) NO ve nada en tablas
  -- restringidas — las policies son TO authenticated.
  -- =================================================================
  SET LOCAL ROLE anon;

  SELECT COUNT(*) INTO v_count FROM public.budget_categories;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [assert 6a]: anon ve % budget_categories (esperaba 0)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.projects;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [assert 6b]: anon ve % projects (esperaba 0)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.project_members;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [assert 6c]: anon ve % project_members (esperaba 0)', v_count;
  END IF;

  RAISE NOTICE 'OK [assert 6]: anon no ve datos en budget_categories/projects/project_members';

  RESET ROLE;

  -- =================================================================
  -- ASSERT 7: los helpers devuelven los valores esperados al invocarse
  -- en un contexto autenticado.
  -- =================================================================
  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_planificacion), true);
  SET LOCAL ROLE authenticated;

  IF NOT public.is_member_of_project(v_poa) THEN
    RAISE EXCEPTION 'FAIL [assert 7a]: is_member_of_project(POA) debería ser true para planificación';
  END IF;
  IF public.is_member_of_project(v_kuboo) THEN
    RAISE EXCEPTION 'FAIL [assert 7b]: is_member_of_project(KUBOO) debería ser false para planificación';
  END IF;
  IF NOT public.current_user_can_access_project(v_poa) THEN
    RAISE EXCEPTION 'FAIL [assert 7c]: current_user_can_access_project(POA) debería ser true para planificación';
  END IF;
  IF public.current_user_can_access_project(v_kuboo) THEN
    RAISE EXCEPTION 'FAIL [assert 7d]: current_user_can_access_project(KUBOO) debería ser false para planificación';
  END IF;
  IF public.current_user_is_director() THEN
    RAISE EXCEPTION 'FAIL [assert 7e]: current_user_is_director debería ser false para planificación';
  END IF;
  RAISE NOTICE 'OK [assert 7]: helpers devuelven valores correctos para planificación';

  PERFORM set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_director), true);
  IF NOT public.current_user_is_director() THEN
    RAISE EXCEPTION 'FAIL [assert 7f]: current_user_is_director debería ser true para director';
  END IF;
  IF NOT public.current_user_can_access_project(v_kuboo) THEN
    RAISE EXCEPTION 'FAIL [assert 7g]: current_user_can_access_project(KUBOO) debería ser true para director';
  END IF;
  RAISE NOTICE 'OK [assert 7]: helpers devuelven valores correctos para director';

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);

  -- =================================================================
  -- ASSERT 8: projects.created_by quedó backfilleado en todos los
  -- proyectos existentes.
  -- =================================================================
  SELECT COUNT(*) INTO v_count FROM public.projects WHERE created_by IS NULL;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL [assert 8]: hay % proyectos con created_by NULL (esperaba 0 tras backfill)', v_count;
  END IF;
  RAISE NOTICE 'OK [assert 8]: todos los proyectos tienen created_by != NULL';

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'rls_isolation.sql -- TODOS LOS ASSERTS OK';
  RAISE NOTICE '==========================================';
END $$;
