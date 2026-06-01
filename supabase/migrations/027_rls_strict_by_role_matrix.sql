-- =====================================================================
-- 025 - RLS estricta por rol, alineada con la matriz de permisos v2
-- ---------------------------------------------------------------------
-- Reemplaza la policy monolitica "rls_strict_authenticated" creada en
-- la migracion 022 (que permitia a cualquier miembro del proyecto
-- escribir cualquier tabla del proyecto) por policies separadas por
-- accion y filtradas por rol segun la matriz acordada con el usuario.
--
--   Sec 1 - Proyecto y presupuesto:  DG, DP, PL
--   Sec 2 - Nomina (crear/editar):   DG, DP, IO  | aprobar/distribuir: DG, DP
--   Sec 3 - Compras:                 DG, DP, IO, CO, AL (segun etapa)
--   Sec 4 - Almacen:                 DG, DP, AL
--   Sec 5 - Obra:                    varia (ver inline)
--   Sec 6 - Cubicaciones:            DG, DP, CO  | cortes: DG, DP, IO
--   Sec 7 - Finanzas:                DG, CT      | prestamos: solo DG
--   Sec 8 - Maestros:                DG, CO      | bancos: DG, CT
--   Sec 9 - Audit log/companies:     solo DG
--
-- SELECT: cualquier authenticated puede leer (la UI esconde lo que no
--   corresponde). Unica excepcion: bank_accounts (DG, DP, CO, CT).
--
-- DG (director general) bypassa todos los chequeos via
--   current_user_is_director(), igual que en 022.
-- =====================================================================

-- =====================================================================
-- Helpers
-- =====================================================================

CREATE OR REPLACE FUNCTION public.user_has_project_role(
  p_project_id uuid,
  VARIADIC p_roles text[]
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_is_director()
      OR (
        p_project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p_project_id
            AND pm.user_id = auth.uid()
            AND pm.role = ANY(p_roles)
        )
      );
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role_anywhere(
  VARIADIC p_roles text[]
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_is_director()
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.user_id = auth.uid()
          AND pm.role = ANY(p_roles)
      );
$$;

CREATE OR REPLACE FUNCTION public._project_of_budget_category(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.budget_categories WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_payroll(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.payroll_periods WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_contract(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.adjustment_contracts WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_requisition(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.purchase_requisitions WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_quote(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public._project_of_requisition(requisition_id) FROM public.purchase_quotes WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_purchase_order(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.purchase_orders WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._project_of_mercado_budget(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT project_id FROM public.mercado_budgets WHERE id = p_id;
$$;

-- =====================================================================
-- Limpieza: borrar la policy de 022 en todas las tablas
-- =====================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'rls_strict_authenticated'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_strict_authenticated" ON public.%I', r.tablename);
  END LOOP;
END $$;

-- =====================================================================
-- SELECT base: cualquier authenticated puede leer (excepto bank_accounts)
-- =====================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
      AND c.relname <> 'bank_accounts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "rls_select_authenticated" ON public.%I', r.tbl);
    EXECUTE format(
      'CREATE POLICY "rls_select_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)',
      r.tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "rls_select_bank_accounts" ON public.bank_accounts;
CREATE POLICY "rls_select_bank_accounts" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (public.user_has_any_role_anywhere(
    'director_proyecto', 'comprador', 'contabilidad'
  ));

-- =====================================================================
-- SECCION 1 - Proyecto y presupuesto (DG, DP, PL; CO para % indirectos)
-- =====================================================================
DROP POLICY IF EXISTS "rls_insert_projects" ON public.projects;
CREATE POLICY "rls_insert_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_update_projects" ON public.projects;
CREATE POLICY "rls_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.user_has_project_role(id,
    'director_proyecto', 'planificacion', 'comprador'))
  WITH CHECK (public.user_has_project_role(id,
    'director_proyecto', 'planificacion', 'comprador'));

DROP POLICY IF EXISTS "rls_delete_projects" ON public.projects;
CREATE POLICY "rls_delete_projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_write_budget_categories" ON public.budget_categories;
CREATE POLICY "rls_write_budget_categories" ON public.budget_categories
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_budget_items" ON public.budget_items;
CREATE POLICY "rls_write_budget_items" ON public.budget_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_budget_category(budget_category_id),
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_budget_category(budget_category_id),
    'director_proyecto', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_budget_versions" ON public.budget_versions;
CREATE POLICY "rls_write_budget_versions" ON public.budget_versions
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_price_list_items" ON public.price_list_items;
CREATE POLICY "rls_write_price_list_items" ON public.price_list_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_mercado_budgets" ON public.mercado_budgets;
CREATE POLICY "rls_write_mercado_budgets" ON public.mercado_budgets
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_mercado_budget_lines" ON public.mercado_budget_lines;
CREATE POLICY "rls_write_mercado_budget_lines" ON public.mercado_budget_lines
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_mercado_budget(budget_id),
    'director_proyecto', 'planificacion'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_mercado_budget(budget_id),
    'director_proyecto', 'planificacion'));

-- =====================================================================
-- SECCION 2 - Nomina  (DG, DP, IO crear/editar; DG, DP aprobar/distribuir)
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_payroll_periods" ON public.payroll_periods;
CREATE POLICY "rls_write_payroll_periods" ON public.payroll_periods
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_labor_line_items" ON public.labor_line_items;
CREATE POLICY "rls_write_labor_line_items" ON public.labor_line_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_indirect_costs" ON public.indirect_costs;
CREATE POLICY "rls_write_indirect_costs" ON public.indirect_costs
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_material_invoices" ON public.material_invoices;
CREATE POLICY "rls_write_material_invoices" ON public.material_invoices
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra'));

-- payment_distributions: solo DG, DP (distribuir pagos post-aprobacion)
DROP POLICY IF EXISTS "rls_write_payment_distributions" ON public.payment_distributions;
CREATE POLICY "rls_write_payment_distributions" ON public.payment_distributions
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto'));

-- =====================================================================
-- SECCION 3 - Compras (union de roles; el flujo de estado lo controla la UI)
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_purchase_requisitions" ON public.purchase_requisitions;
CREATE POLICY "rls_write_purchase_requisitions" ON public.purchase_requisitions
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_purchase_orders" ON public.purchase_orders;
CREATE POLICY "rls_write_purchase_orders" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "rls_write_purchase_order_items" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_purchase_order(purchase_order_id),
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_purchase_order(purchase_order_id),
    'director_proyecto', 'ingeniero_obra', 'comprador', 'almacenista', 'planificacion'));

DROP POLICY IF EXISTS "rls_write_purchase_quotes" ON public.purchase_quotes;
CREATE POLICY "rls_write_purchase_quotes" ON public.purchase_quotes
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_requisition(requisition_id),
    'comprador'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_requisition(requisition_id),
    'comprador'));

DROP POLICY IF EXISTS "rls_write_purchase_quote_items" ON public.purchase_quote_items;
CREATE POLICY "rls_write_purchase_quote_items" ON public.purchase_quote_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_quote(quote_id),
    'comprador'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_quote(quote_id),
    'comprador'));

-- =====================================================================
-- SECCION 4 - Almacen (DG, DP, AL)
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_inventory_items" ON public.inventory_items;
CREATE POLICY "rls_write_inventory_items" ON public.inventory_items
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'almacenista'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'almacenista'));

DROP POLICY IF EXISTS "rls_write_inventory_movements" ON public.inventory_movements;
CREATE POLICY "rls_write_inventory_movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'almacenista'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'almacenista'));

-- =====================================================================
-- SECCION 5 - Obra
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_bitacora_entries" ON public.bitacora_entries;
CREATE POLICY "rls_write_bitacora_entries" ON public.bitacora_entries
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_attendance_records" ON public.attendance_records;
CREATE POLICY "rls_write_attendance_records" ON public.attendance_records
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_quality_control" ON public.quality_control;
CREATE POLICY "rls_write_quality_control" ON public.quality_control
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id, 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id, 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_partida_progress" ON public.partida_progress;
CREATE POLICY "rls_write_partida_progress" ON public.partida_progress
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'planificacion', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id,
    'planificacion', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_schedule_tasks" ON public.schedule_tasks;
CREATE POLICY "rls_write_schedule_tasks" ON public.schedule_tasks
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id, 'planificacion'))
  WITH CHECK (public.user_has_project_role(project_id, 'planificacion'));

-- =====================================================================
-- SECCION 6 - Cubicaciones / Contratos
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_adjustment_contracts" ON public.adjustment_contracts;
CREATE POLICY "rls_write_adjustment_contracts" ON public.adjustment_contracts
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'comprador'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'comprador'));

DROP POLICY IF EXISTS "rls_write_contract_partidas" ON public.contract_partidas;
CREATE POLICY "rls_write_contract_partidas" ON public.contract_partidas
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto', 'comprador'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto', 'comprador'));

DROP POLICY IF EXISTS "rls_write_contract_cortes" ON public.contract_cortes;
CREATE POLICY "rls_write_contract_cortes" ON public.contract_cortes
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto', 'ingeniero_obra'));

DROP POLICY IF EXISTS "rls_write_contract_adelantos" ON public.contract_adelantos;
CREATE POLICY "rls_write_contract_adelantos" ON public.contract_adelantos
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_contract(contract_id),
    'director_proyecto'));

DROP POLICY IF EXISTS "rls_write_contract_cubications" ON public.contract_cubications;
CREATE POLICY "rls_write_contract_cubications" ON public.contract_cubications
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'))
  WITH CHECK (public.user_has_project_role(project_id,
    'director_proyecto', 'ingeniero_obra'));

-- =====================================================================
-- SECCION 7 - Finanzas (DG, CT; prestamos solo DG)
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_transactions" ON public.transactions;
CREATE POLICY "rls_write_transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id, 'contabilidad'))
  WITH CHECK (public.user_has_project_role(project_id, 'contabilidad'));

DROP POLICY IF EXISTS "rls_write_expected_cash_inflows" ON public.expected_cash_inflows;
CREATE POLICY "rls_write_expected_cash_inflows" ON public.expected_cash_inflows
  FOR ALL TO authenticated
  USING (public.user_has_project_role(project_id, 'contabilidad'))
  WITH CHECK (public.user_has_project_role(project_id, 'contabilidad'));

DROP POLICY IF EXISTS "rls_write_contractor_loans" ON public.contractor_loans;
CREATE POLICY "rls_write_contractor_loans" ON public.contractor_loans
  FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

-- loan_deductions: se crean al calcular nominas (DP/IO) y al cerrar pagos (CT).
-- Permitimos union; el flujo de estado lo controla la UI.
DROP POLICY IF EXISTS "rls_write_loan_deductions" ON public.loan_deductions;
CREATE POLICY "rls_write_loan_deductions" ON public.loan_deductions
  FOR ALL TO authenticated
  USING (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra', 'contabilidad'))
  WITH CHECK (public.user_has_project_role(
    public._project_of_payroll(payroll_period_id),
    'director_proyecto', 'ingeniero_obra', 'contabilidad'));

-- =====================================================================
-- SECCION 8 - Maestros app-wide
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_contractors" ON public.contractors;
CREATE POLICY "rls_write_contractors" ON public.contractors
  FOR ALL TO authenticated
  USING (public.user_has_any_role_anywhere('comprador'))
  WITH CHECK (public.user_has_any_role_anywhere('comprador'));

DROP POLICY IF EXISTS "rls_write_suppliers" ON public.suppliers;
CREATE POLICY "rls_write_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.user_has_any_role_anywhere('comprador'))
  WITH CHECK (public.user_has_any_role_anywhere('comprador'));

DROP POLICY IF EXISTS "rls_write_materials_catalog" ON public.materials_catalog;
CREATE POLICY "rls_write_materials_catalog" ON public.materials_catalog
  FOR ALL TO authenticated
  USING (public.user_has_any_role_anywhere('comprador'))
  WITH CHECK (public.user_has_any_role_anywhere('comprador'));

DROP POLICY IF EXISTS "rls_write_contractor_documents" ON public.contractor_documents;
CREATE POLICY "rls_write_contractor_documents" ON public.contractor_documents
  FOR ALL TO authenticated
  USING (public.user_has_any_role_anywhere('comprador'))
  WITH CHECK (public.user_has_any_role_anywhere('comprador'));

DROP POLICY IF EXISTS "rls_write_bank_accounts" ON public.bank_accounts;
CREATE POLICY "rls_write_bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (public.user_has_any_role_anywhere('contabilidad'))
  WITH CHECK (public.user_has_any_role_anywhere('contabilidad'));

-- =====================================================================
-- SECCION 9 - Audit, companies, project_members (solo DG)
-- =====================================================================

-- approvals: cualquier authenticated puede INSERT (el sistema loguea
-- aprobaciones desde triggers/codigo). UPDATE/DELETE solo DG.
DROP POLICY IF EXISTS "rls_insert_approvals" ON public.approvals;
CREATE POLICY "rls_insert_approvals" ON public.approvals
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rls_update_approvals" ON public.approvals;
CREATE POLICY "rls_update_approvals" ON public.approvals
  FOR UPDATE TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_delete_approvals" ON public.approvals;
CREATE POLICY "rls_delete_approvals" ON public.approvals
  FOR DELETE TO authenticated
  USING (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_write_companies" ON public.companies;
CREATE POLICY "rls_write_companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_write_project_members" ON public.project_members;
CREATE POLICY "rls_write_project_members" ON public.project_members
  FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

-- =====================================================================
-- Tablas user-owned: user_profiles, push_subscriptions
-- =====================================================================
DROP POLICY IF EXISTS "rls_write_own_profile" ON public.user_profiles;
CREATE POLICY "rls_write_own_profile" ON public.user_profiles
  FOR ALL TO authenticated
  USING (id = auth.uid() OR public.current_user_is_director())
  WITH CHECK (id = auth.uid() OR public.current_user_is_director());

-- push_subscriptions.user_id es text (proviene de auth.users.id casteado).
DROP POLICY IF EXISTS "rls_write_own_push" ON public.push_subscriptions;
CREATE POLICY "rls_write_own_push" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text OR public.current_user_is_director())
  WITH CHECK (user_id = auth.uid()::text OR public.current_user_is_director());
