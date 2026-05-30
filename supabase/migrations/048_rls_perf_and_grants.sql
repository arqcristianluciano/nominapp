-- 048_rls_perf_and_grants.sql
-- Performance + security hardening based on Supabase advisor findings
-- (project pkllcsexipdvwdpunlkz).
--
-- This migration is fully idempotent and addresses three advisor categories:
--   1. auth_rls_initplan       -> wrap bare auth.uid() in (select auth.uid())
--   2. unindexed_foreign_keys  -> add btree indexes on uncovered FK columns
--   3. security_definer_function_executable -> revoke EXECUTE on _audit_* fns
--
-- COORDINATION NOTE:
--   Migration 043 (RLS-SELECT) owns the SELECT policies. This migration ONLY
--   rewrites WRITE policies (cmd = ALL / INSERT / UPDATE / DELETE) that still
--   reference a bare auth.uid(). SELECT policies are intentionally untouched
--   here to avoid clobbering 043.
--
-- Indexes intentionally NOT duplicated from 042_performance_indices.sql:
--   idx_payroll_periods_project_report_date, idx_purchase_orders_project_status,
--   idx_quality_control_project_pour_date (none overlap the FK list below).

-- =====================================================================
-- 1. auth_rls_initplan: rewrite WRITE policies to use (select auth.uid())
--    Wrapping in a scalar subquery makes Postgres evaluate auth.uid() once
--    per statement (initplan) instead of once per row.
--    Only ALL-command policies below; SELECT policies are owned by 043.
-- =====================================================================

-- user_documents: rls_write_user_documents (ALL)
DROP POLICY IF EXISTS rls_write_user_documents ON public.user_documents;
CREATE POLICY rls_write_user_documents ON public.user_documents
  FOR ALL
  USING ((user_id = (select auth.uid())) OR current_user_is_director())
  WITH CHECK ((user_id = (select auth.uid())) OR current_user_is_director());

-- user_profiles: rls_write_own_profile (ALL)
DROP POLICY IF EXISTS rls_write_own_profile ON public.user_profiles;
CREATE POLICY rls_write_own_profile ON public.user_profiles
  FOR ALL
  USING ((id = (select auth.uid())) OR current_user_is_director())
  WITH CHECK ((id = (select auth.uid())) OR current_user_is_director());

-- push_subscriptions: rls_write_own_push (ALL)
DROP POLICY IF EXISTS rls_write_own_push ON public.push_subscriptions;
CREATE POLICY rls_write_own_push ON public.push_subscriptions
  FOR ALL
  USING ((user_id = ((select auth.uid()))::text) OR current_user_is_director())
  WITH CHECK ((user_id = ((select auth.uid()))::text) OR current_user_is_director());

-- =====================================================================
-- 2. unindexed_foreign_keys: add btree index on each uncovered FK column.
--    All CREATE INDEX IF NOT EXISTS, so safe to re-run.
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_records_contractor_id
  ON public.attendance_records (contractor_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_project_id
  ON public.bank_accounts (project_id);
CREATE INDEX IF NOT EXISTS idx_contract_cortes_linked_payroll_id
  ON public.contract_cortes (linked_payroll_id);
CREATE INDEX IF NOT EXISTS idx_contract_cubications_contractor_id
  ON public.contract_cubications (contractor_id);
CREATE INDEX IF NOT EXISTS idx_contract_cubications_project_id
  ON public.contract_cubications (project_id);
CREATE INDEX IF NOT EXISTS idx_indirect_costs_payroll_period_id
  ON public.indirect_costs (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_budget_category_id
  ON public.inventory_movements (budget_category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_lot_id
  ON public.inventory_movements (lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_supplier_id
  ON public.inventory_movements (supplier_id);
CREATE INDEX IF NOT EXISTS idx_labor_line_items_contractor_id
  ON public.labor_line_items (contractor_id);
CREATE INDEX IF NOT EXISTS idx_labor_line_items_payroll_period_id
  ON public.labor_line_items (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_loan_deductions_contractor_id
  ON public.loan_deductions (contractor_id);
CREATE INDEX IF NOT EXISTS idx_material_invoices_budget_category_id
  ON public.material_invoices (budget_category_id);
CREATE INDEX IF NOT EXISTS idx_material_invoices_payroll_period_id
  ON public.material_invoices (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_material_invoices_supplier_id
  ON public.material_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_mercado_budget_lines_contract_id
  ON public.mercado_budget_lines (contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_distributions_bank_account_id
  ON public.payment_distributions (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_distributions_payroll_period_id
  ON public.payment_distributions (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_project_id
  ON public.price_list_items (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id
  ON public.projects (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quote_items_quote_id
  ON public.purchase_quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotes_requisition_id
  ON public.purchase_quotes (requisition_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotes_supplier_id
  ON public.purchase_quotes (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_budget_category_id
  ON public.purchase_requisitions (budget_category_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_project_id
  ON public.purchase_requisitions (project_id);
CREATE INDEX IF NOT EXISTS idx_role_capabilities_capability_id
  ON public.role_capabilities (capability_id);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_category_id
  ON public.transactions (budget_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payroll_period_id
  ON public.transactions (payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id
  ON public.transactions (supplier_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id
  ON public.user_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_bank_account_id
  ON public.user_profiles (bank_account_id);

-- =====================================================================
-- 3. security_definer_function_executable: revoke EXECUTE on the
--    SECURITY DEFINER audit trigger functions from anon/authenticated.
--    These are trigger functions and must not be directly callable.
--    REVOKE is idempotent. All four take no arguments.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public._audit_capability_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._audit_project_member_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._audit_role_capability_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._audit_role_changes() FROM anon, authenticated;
