-- ---------------------------------------------------------------------
-- 032 - RLS: sign_contract capability + project_members composite indexes
-- ---------------------------------------------------------------------
--
-- Contexto:
--
-- 1) En la migracion 028 se definio la capability `sign_contract` y se
--    mapeo a los roles DG / DP / CO via `role_capabilities`. Sin embargo,
--    la policy RLS de `adjustment_contracts` (creada en 029) solo verifica
--    `create_contract`. Eso significa que la capability `sign_contract`
--    actualmente no protege ninguna fila a nivel RLS: cualquier cliente
--    que hable directo con Supabase puede escribir `signed_date` /
--    `signature_data` siempre que tenga `create_contract` (sin necesidad
--    de tener `sign_contract`).
--
--    Hoy los dos capabilities estan mapeadas a los mismos roles (DG/DP/CO),
--    asi que la diferencia practica solo aparece cuando un admin custom
--    asigne las capabilities por separado. La solucion mas simple y
--    forward-compatible es relajar la policy a "cualquiera de las dos
--    basta": asi un admin puede dar solo `sign_contract` (o solo
--    `create_contract`) a un perfil custom sin romper la policy.
--
-- 2) Las policies RLS basadas en capabilities (definidas en 028/029)
--    hacen subqueries del tipo:
--        WHERE pm.project_id = X AND pm.user_id = auth.uid()
--    en CADA query autenticada. La tabla `project_members` solo tiene
--    indices de columna unica (idx_project_members_user,
--    idx_project_members_project), lo cual fuerza a Postgres a hacer
--    bitmap scans o seq scans en lugar de un index-only scan compuesto.
--    Agregamos indices compuestos en ambos ordenes para que el planner
--    elija un index scan exacto independientemente del orden de columnas.
-- ---------------------------------------------------------------------

-- 1) Policy: aceptar create_contract O sign_contract
DROP POLICY IF EXISTS "rls_write_adjustment_contracts" ON public.adjustment_contracts;
CREATE POLICY "rls_write_adjustment_contracts" ON public.adjustment_contracts
  FOR ALL TO authenticated
  USING      (public.user_has_any_capability(project_id, 'create_contract', 'sign_contract'))
  WITH CHECK (public.user_has_any_capability(project_id, 'create_contract', 'sign_contract'));

-- 2) Indices compuestos para acelerar lookups RLS sobre project_members
CREATE INDEX IF NOT EXISTS idx_project_members_user_project
  ON public.project_members(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_user
  ON public.project_members(project_id, user_id);
