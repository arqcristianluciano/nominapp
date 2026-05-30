-- =====================================================================
-- 029 - RLS basada en capabilities (no en slugs de rol)
-- ---------------------------------------------------------------------
-- Reemplaza las policies que hablaban de roles concretos (e.g.
-- 'director_proyecto') por chequeos de capabilities. Asi cuando el
-- admin tildea/destildea un permiso en la matriz, RLS responde
-- inmediatamente sin tocar codigo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Seccion 1 - Proyecto y presupuesto
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_insert_projects" ON public.projects;
CREATE POLICY "rls_insert_projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.user_has_capability_anywhere('edit_project'));

DROP POLICY IF EXISTS "rls_update_projects" ON public.projects;
CREATE POLICY "rls_update_projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.user_has_any_capability(id, 'edit_project', 'write_project_indirects'))
  WITH CHECK (public.user_has_any_capability(id, 'edit_project', 'write_project_indirects'));

DROP POLICY IF EXISTS "rls_write_budget_categories" ON public.budget_categories;
CREATE POLICY "rls_write_budget_categories" ON public.budget_categories FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'edit_budget'))
  WITH CHECK (public.user_has_capability(project_id, 'edit_budget'));

DROP POLICY IF EXISTS "rls_write_budget_items" ON public.budget_items;
CREATE POLICY "rls_write_budget_items" ON public.budget_items FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_budget_category(budget_category_id), 'edit_budget'))
  WITH CHECK (public.user_has_capability(public._project_of_budget_category(budget_category_id), 'edit_budget'));

DROP POLICY IF EXISTS "rls_write_budget_versions" ON public.budget_versions;
CREATE POLICY "rls_write_budget_versions" ON public.budget_versions FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'edit_budget'))
  WITH CHECK (public.user_has_capability(project_id, 'edit_budget'));

DROP POLICY IF EXISTS "rls_write_price_list_items" ON public.price_list_items;
CREATE POLICY "rls_write_price_list_items" ON public.price_list_items FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'edit_price_list'))
  WITH CHECK (public.user_has_capability(project_id, 'edit_price_list'));

DROP POLICY IF EXISTS "rls_write_mercado_budgets" ON public.mercado_budgets;
CREATE POLICY "rls_write_mercado_budgets" ON public.mercado_budgets FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'edit_insumos'))
  WITH CHECK (public.user_has_capability(project_id, 'edit_insumos'));

DROP POLICY IF EXISTS "rls_write_mercado_budget_lines" ON public.mercado_budget_lines;
CREATE POLICY "rls_write_mercado_budget_lines" ON public.mercado_budget_lines FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_mercado_budget(budget_id), 'edit_insumos'))
  WITH CHECK (public.user_has_capability(public._project_of_mercado_budget(budget_id), 'edit_insumos'));

-- ---------------------------------------------------------------------
-- Seccion 2 - Nomina
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_payroll_periods" ON public.payroll_periods;
CREATE POLICY "rls_write_payroll_periods" ON public.payroll_periods FOR ALL TO authenticated
  USING (public.user_has_any_capability(project_id, 'create_payroll','edit_payroll','submit_payroll','approve_payroll','distribute_payments','delete_payroll_draft'))
  WITH CHECK (public.user_has_any_capability(project_id, 'create_payroll','edit_payroll','submit_payroll','approve_payroll','distribute_payments','delete_payroll_draft'));

DROP POLICY IF EXISTS "rls_write_labor_line_items" ON public.labor_line_items;
CREATE POLICY "rls_write_labor_line_items" ON public.labor_line_items FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'))
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'));

DROP POLICY IF EXISTS "rls_write_indirect_costs" ON public.indirect_costs;
CREATE POLICY "rls_write_indirect_costs" ON public.indirect_costs FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'))
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'));

DROP POLICY IF EXISTS "rls_write_material_invoices" ON public.material_invoices;
CREATE POLICY "rls_write_material_invoices" ON public.material_invoices FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'))
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'));

DROP POLICY IF EXISTS "rls_write_payment_distributions" ON public.payment_distributions;
CREATE POLICY "rls_write_payment_distributions" ON public.payment_distributions FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'distribute_payments'))
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'distribute_payments'));

-- ---------------------------------------------------------------------
-- Seccion 3 - Compras
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_purchase_requisitions" ON public.purchase_requisitions;
CREATE POLICY "rls_write_purchase_requisitions" ON public.purchase_requisitions FOR ALL TO authenticated
  USING (public.user_has_any_capability(project_id, 'create_requisition','load_quotes','approve_excess','release_purchase_order','receive_order'))
  WITH CHECK (public.user_has_any_capability(project_id, 'create_requisition','load_quotes','approve_excess','release_purchase_order','receive_order'));

DROP POLICY IF EXISTS "rls_write_purchase_orders" ON public.purchase_orders;
CREATE POLICY "rls_write_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.user_has_any_capability(project_id, 'create_requisition','load_quotes','release_purchase_order','receive_order'))
  WITH CHECK (public.user_has_any_capability(project_id, 'create_requisition','load_quotes','release_purchase_order','receive_order'));

DROP POLICY IF EXISTS "rls_write_purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "rls_write_purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.user_has_any_capability(public._project_of_purchase_order(purchase_order_id), 'create_requisition','load_quotes','release_purchase_order','receive_order'))
  WITH CHECK (public.user_has_any_capability(public._project_of_purchase_order(purchase_order_id), 'create_requisition','load_quotes','release_purchase_order','receive_order'));

DROP POLICY IF EXISTS "rls_write_purchase_quotes" ON public.purchase_quotes;
CREATE POLICY "rls_write_purchase_quotes" ON public.purchase_quotes FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_requisition(requisition_id), 'load_quotes'))
  WITH CHECK (public.user_has_capability(public._project_of_requisition(requisition_id), 'load_quotes'));

DROP POLICY IF EXISTS "rls_write_purchase_quote_items" ON public.purchase_quote_items;
CREATE POLICY "rls_write_purchase_quote_items" ON public.purchase_quote_items FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_quote(quote_id), 'load_quotes'))
  WITH CHECK (public.user_has_capability(public._project_of_quote(quote_id), 'load_quotes'));

-- ---------------------------------------------------------------------
-- Seccion 4 - Almacen
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_inventory_items" ON public.inventory_items;
CREATE POLICY "rls_write_inventory_items" ON public.inventory_items FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'inventory_write'))
  WITH CHECK (public.user_has_capability(project_id, 'inventory_write'));

DROP POLICY IF EXISTS "rls_write_inventory_movements" ON public.inventory_movements;
CREATE POLICY "rls_write_inventory_movements" ON public.inventory_movements FOR ALL TO authenticated
  USING (public.user_has_any_capability(project_id, 'inventory_write','override_stock'))
  WITH CHECK (public.user_has_any_capability(project_id, 'inventory_write','override_stock'));

-- ---------------------------------------------------------------------
-- Seccion 5 - Obra
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_bitacora_entries" ON public.bitacora_entries;
CREATE POLICY "rls_write_bitacora_entries" ON public.bitacora_entries FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_bitacora'))
  WITH CHECK (public.user_has_capability(project_id, 'write_bitacora'));

DROP POLICY IF EXISTS "rls_write_attendance_records" ON public.attendance_records;
CREATE POLICY "rls_write_attendance_records" ON public.attendance_records FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_attendance'))
  WITH CHECK (public.user_has_capability(project_id, 'write_attendance'));

DROP POLICY IF EXISTS "rls_write_quality_control" ON public.quality_control;
CREATE POLICY "rls_write_quality_control" ON public.quality_control FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_quality'))
  WITH CHECK (public.user_has_capability(project_id, 'write_quality'));

DROP POLICY IF EXISTS "rls_write_partida_progress" ON public.partida_progress;
CREATE POLICY "rls_write_partida_progress" ON public.partida_progress FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'measure_progress'))
  WITH CHECK (public.user_has_capability(project_id, 'measure_progress'));

DROP POLICY IF EXISTS "rls_write_schedule_tasks" ON public.schedule_tasks;
CREATE POLICY "rls_write_schedule_tasks" ON public.schedule_tasks FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_schedule'))
  WITH CHECK (public.user_has_capability(project_id, 'write_schedule'));

-- ---------------------------------------------------------------------
-- Seccion 6 - Cubicaciones
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_adjustment_contracts" ON public.adjustment_contracts;
CREATE POLICY "rls_write_adjustment_contracts" ON public.adjustment_contracts FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'create_contract'))
  WITH CHECK (public.user_has_capability(project_id, 'create_contract'));

DROP POLICY IF EXISTS "rls_write_contract_partidas" ON public.contract_partidas;
CREATE POLICY "rls_write_contract_partidas" ON public.contract_partidas FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_contract(contract_id), 'edit_contract_partidas'))
  WITH CHECK (public.user_has_capability(public._project_of_contract(contract_id), 'edit_contract_partidas'));

DROP POLICY IF EXISTS "rls_write_contract_cortes" ON public.contract_cortes;
CREATE POLICY "rls_write_contract_cortes" ON public.contract_cortes FOR ALL TO authenticated
  USING (public.user_has_any_capability(public._project_of_contract(contract_id), 'create_corte','approve_corte'))
  WITH CHECK (public.user_has_any_capability(public._project_of_contract(contract_id), 'create_corte','approve_corte'));

DROP POLICY IF EXISTS "rls_write_contract_adelantos" ON public.contract_adelantos;
CREATE POLICY "rls_write_contract_adelantos" ON public.contract_adelantos FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_contract(contract_id), 'write_adelantos'))
  WITH CHECK (public.user_has_capability(public._project_of_contract(contract_id), 'write_adelantos'));

DROP POLICY IF EXISTS "rls_write_contract_cubications" ON public.contract_cubications;
CREATE POLICY "rls_write_contract_cubications" ON public.contract_cubications FOR ALL TO authenticated
  USING (public.user_has_any_capability(project_id, 'create_corte','approve_corte'))
  WITH CHECK (public.user_has_any_capability(project_id, 'create_corte','approve_corte'));

-- ---------------------------------------------------------------------
-- Seccion 7 - Finanzas
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_transactions" ON public.transactions;
CREATE POLICY "rls_write_transactions" ON public.transactions FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_ledger'))
  WITH CHECK (public.user_has_capability(project_id, 'write_ledger'));

DROP POLICY IF EXISTS "rls_write_expected_cash_inflows" ON public.expected_cash_inflows;
CREATE POLICY "rls_write_expected_cash_inflows" ON public.expected_cash_inflows FOR ALL TO authenticated
  USING (public.user_has_capability(project_id, 'write_ledger'))
  WITH CHECK (public.user_has_capability(project_id, 'write_ledger'));

DROP POLICY IF EXISTS "rls_write_contractor_loans" ON public.contractor_loans;
CREATE POLICY "rls_write_contractor_loans" ON public.contractor_loans FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_loans'))
  WITH CHECK (public.user_has_capability_anywhere('write_loans'));

DROP POLICY IF EXISTS "rls_write_loan_deductions" ON public.loan_deductions;
CREATE POLICY "rls_write_loan_deductions" ON public.loan_deductions FOR ALL TO authenticated
  USING (public.user_has_any_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll','write_ledger','write_loans'))
  WITH CHECK (public.user_has_any_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll','write_ledger','write_loans'));

-- ---------------------------------------------------------------------
-- Seccion 8 - Maestros app-wide
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_contractors" ON public.contractors;
CREATE POLICY "rls_write_contractors" ON public.contractors FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_contractors'))
  WITH CHECK (public.user_has_capability_anywhere('write_contractors'));

DROP POLICY IF EXISTS "rls_write_suppliers" ON public.suppliers;
CREATE POLICY "rls_write_suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_suppliers'))
  WITH CHECK (public.user_has_capability_anywhere('write_suppliers'));

DROP POLICY IF EXISTS "rls_write_materials_catalog" ON public.materials_catalog;
CREATE POLICY "rls_write_materials_catalog" ON public.materials_catalog FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_materials_catalog'))
  WITH CHECK (public.user_has_capability_anywhere('write_materials_catalog'));

DROP POLICY IF EXISTS "rls_write_contractor_documents" ON public.contractor_documents;
CREATE POLICY "rls_write_contractor_documents" ON public.contractor_documents FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_contractors'))
  WITH CHECK (public.user_has_capability_anywhere('write_contractors'));

DROP POLICY IF EXISTS "rls_write_bank_accounts" ON public.bank_accounts;
CREATE POLICY "rls_write_bank_accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_bank_accounts'))
  WITH CHECK (public.user_has_capability_anywhere('write_bank_accounts'));

-- bank_accounts: tambien refinamos el SELECT para que solo lo vean los
-- roles con view o write de finanzas/bancos
DROP POLICY IF EXISTS "rls_select_bank_accounts" ON public.bank_accounts;
CREATE POLICY "rls_select_bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated
  USING (
    public.user_has_capability_anywhere('write_bank_accounts')
    OR public.user_has_capability_anywhere('mark_paid')
    OR public.user_has_capability_anywhere('issue_check')
    OR public.user_has_capability_anywhere('write_contractors')
  );

-- ---------------------------------------------------------------------
-- Seccion 9 - Companies/project_members: solo DG (manage_users)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_write_companies" ON public.companies;
CREATE POLICY "rls_write_companies" ON public.companies FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('manage_users'))
  WITH CHECK (public.user_has_capability_anywhere('manage_users'));

DROP POLICY IF EXISTS "rls_write_project_members" ON public.project_members;
CREATE POLICY "rls_write_project_members" ON public.project_members FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('manage_users'))
  WITH CHECK (public.user_has_capability_anywhere('manage_users'));

-- approvals/user_profiles/push_subscriptions ya estan bien (user-owned + DG bypass).
