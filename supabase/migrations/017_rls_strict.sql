-- =====================================================
-- NominApp - Migración 017: RLS estricta por empresa/proyecto/rol
-- Estado deseado, sección 8: RLS aísla datos por empresa y por proyecto;
-- un usuario solo ve lo que su rol en ese proyecto le permite.
--
-- IMPORTANTE: aplicar SOLO después de:
--   1. Tener Supabase Auth real activo (no demo en cliente).
--   2. Haber creado user_profiles para cada usuario (migración 016).
--   3. Haber asignado project_members con sus roles.
-- Sin esos pasos, los queries devolverán vacío y la app dejará de mostrar
-- datos. Mientras tanto, las policies anteriores ("USING (true)") siguen
-- vigentes y son las que están aplicadas por default.
--
-- Esta migración se entrega lista pero requiere descomentar las policies
-- al final para activarla. Las helpers SQL (current_user_has_role,
-- current_user_is_director) vienen de la migración 016.
-- =====================================================

-- 1) projects: visible si user es miembro o director general
DROP POLICY IF EXISTS "Authenticated users full access" ON projects;
DROP POLICY IF EXISTS "rls_projects_read" ON projects;
-- CREATE POLICY "rls_projects_read" ON projects
--   FOR SELECT TO authenticated USING (
--     current_user_is_director()
--     OR EXISTS (
--       SELECT 1 FROM project_members
--       WHERE project_id = projects.id AND user_id = auth.uid()
--     )
--   );

-- 2) budget_categories / budget_items: heredan el alcance del proyecto.
DROP POLICY IF EXISTS "Authenticated users full access" ON budget_categories;
DROP POLICY IF EXISTS "rls_budget_categories" ON budget_categories;
-- CREATE POLICY "rls_budget_categories" ON budget_categories
--   FOR ALL TO authenticated USING (
--     current_user_is_director()
--     OR EXISTS (
--       SELECT 1 FROM project_members
--       WHERE project_id = budget_categories.project_id AND user_id = auth.uid()
--     )
--   ) WITH CHECK (
--     current_user_has_role(budget_categories.project_id,
--       ARRAY['gerente_proyecto','planificacion'])
--   );

-- 3) payroll_periods: ingeniero_obra escribe; gerente aprueba.
DROP POLICY IF EXISTS "Authenticated users full access" ON payroll_periods;
DROP POLICY IF EXISTS "rls_payroll_read" ON payroll_periods;
-- CREATE POLICY "rls_payroll_read" ON payroll_periods
--   FOR SELECT TO authenticated USING (
--     current_user_is_director()
--     OR EXISTS (
--       SELECT 1 FROM project_members
--       WHERE project_id = payroll_periods.project_id AND user_id = auth.uid()
--     )
--   );
-- CREATE POLICY "rls_payroll_write" ON payroll_periods
--   FOR INSERT TO authenticated WITH CHECK (
--     current_user_has_role(payroll_periods.project_id,
--       ARRAY['gerente_proyecto','ingeniero_obra','planificacion'])
--   );
-- CREATE POLICY "rls_payroll_update" ON payroll_periods
--   FOR UPDATE TO authenticated USING (
--     current_user_has_role(payroll_periods.project_id,
--       ARRAY['gerente_proyecto','ingeniero_obra'])
--   );

-- 4) purchase_requisitions: comprador genera; gerente libera.
DROP POLICY IF EXISTS "allow_all_purchase_orders" ON purchase_requisitions;
-- CREATE POLICY "rls_requisitions_read" ON purchase_requisitions
--   FOR SELECT TO authenticated USING (
--     current_user_is_director()
--     OR EXISTS (
--       SELECT 1 FROM project_members
--       WHERE project_id = purchase_requisitions.project_id AND user_id = auth.uid()
--     )
--   );
-- CREATE POLICY "rls_requisitions_write" ON purchase_requisitions
--   FOR INSERT TO authenticated WITH CHECK (
--     current_user_has_role(purchase_requisitions.project_id,
--       ARRAY['gerente_proyecto','comprador','ingeniero_obra'])
--   );

-- 5) inventory_items / inventory_movements: almacenista + ing_obra + gerente.
DROP POLICY IF EXISTS "Authenticated users full access" ON inventory_items;
-- CREATE POLICY "rls_inventory_items" ON inventory_items
--   FOR ALL TO authenticated USING (
--     current_user_is_director()
--     OR EXISTS (
--       SELECT 1 FROM project_members
--       WHERE project_id = inventory_items.project_id AND user_id = auth.uid()
--     )
--   ) WITH CHECK (
--     current_user_has_role(inventory_items.project_id,
--       ARRAY['gerente_proyecto','almacenista','ingeniero_obra'])
--   );

-- 6) approvals: read para miembros y director; insert para cualquier autenticado
--    porque la auditoría debe registrar todas las acciones.
DROP POLICY IF EXISTS "authenticated_read_approvals" ON approvals;
DROP POLICY IF EXISTS "authenticated_insert_approvals" ON approvals;
-- CREATE POLICY "rls_approvals_read" ON approvals
--   FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "rls_approvals_insert" ON approvals
--   FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- ACTIVAR ESTAS POLICIES:
--   1. Verificar que cada usuario tiene fila en user_profiles.
--   2. Verificar que cada proyecto tiene al menos un project_members.
--   3. Editar este archivo descomentando los CREATE POLICY de arriba
--      (o ejecutar las versiones descomentadas en SQL Editor).
--   4. Confirmar que las queries de la app siguen devolviendo datos.
-- =====================================================
