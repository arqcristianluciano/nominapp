-- =====================================================================
-- 043 - CRITICAL multi-tenant security fix: scope SELECT to tenancy
-- ---------------------------------------------------------------------
-- RLS audit (project pkllcsexipdvwdpunlkz) found that 44 public tables
-- carried a SELECT policy named "rls_select_authenticated" with
-- USING (true). Because RLS SELECT policies are OR-combined and these
-- granted unconditional read to the `authenticated` role, ANY logged-in
-- user could read EVERY company's data (cross-tenant read hole). Writes
-- were already capability/company scoped (see 044), but reads were not.
--
-- This migration DROPs each open SELECT policy and replaces it with a
-- tenancy-scoped one. Tables are categorized by how they reach a tenant:
--
--   * GLOBAL CONFIG  -> intentionally kept readable by all authenticated
--   * project_id      -> current_user_can_access_project(project_id)
--   * parent chain    -> EXISTS subquery to the parent's project/company
--   * identity/own    -> auth.uid() / company-overlap predicates
--
-- Directors always bypass (current_user_is_director()), matching the
-- write policies and the existing helper contract.
--
-- Helpers used (all pre-existing, all STABLE SECURITY DEFINER with
-- search_path pinned):
--   - public.current_user_is_director()              -> bool
--   - public.current_user_can_access_project(uuid)   -> bool
--       (delegates to is_member_of_project + director)
--   - public.user_companies()                        -> setof(company_id)
-- No new helper is required: current_user_can_access_project already
-- wraps the EXISTS(project_members ...) membership check that the task
-- described as `is_project_member`. To make the intent explicit and to
-- keep the per-tenant child predicates short, we (idempotently)
-- (re)create two small SECURITY DEFINER convenience helpers below for
-- the project-less reference tables `contractors` and `suppliers`.
--
-- Conventions (match 044_rls_insert_checks.sql):
--   - DROP POLICY IF EXISTS then CREATE POLICY (idempotent / re-runnable)
--   - FOR SELECT TO authenticated, policy name kept: rls_select_authenticated
--   - every auth.uid() is wrapped as (select auth.uid()) so the initplan
--     is evaluated once per statement (RLS performance best practice)
--   - helpers created first, then policies (ordered)
--
-- NOTE / DEVIATION from the original task spec: `price_list_items` was
-- listed as "global config", but inspection shows it HAS a `project_id`
-- column (2 distinct projects in prod). It is therefore treated as a
-- project-scoped table, NOT global. True global config (no per-tenant
-- column) is only: roles, capabilities, role_capabilities,
-- materials_catalog.
-- =====================================================================

-- =====================================================================
-- 0) Convenience helpers for project-less reference tables.
--    contractors/suppliers have no project_id or company_id of their own;
--    a caller may see one only if it is referenced by a row in a project
--    they can access. These SECURITY DEFINER helpers encapsulate that
--    "is this contractor/supplier visible to me?" check so the table
--    policies stay readable. Director visibility is handled in the
--    policy via current_user_is_director().
-- =====================================================================

CREATE OR REPLACE FUNCTION public.current_user_sees_contractor(p_contractor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- visible if the contractor appears under any project the caller is a
  -- member of (adjustment_contracts / contract_cubications / attendance /
  -- labor line items all carry contractor_id and resolve to a project)
  SELECT EXISTS (
    SELECT 1 FROM public.adjustment_contracts ac
    WHERE ac.contractor_id = p_contractor_id
      AND public.is_member_of_project(ac.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.contract_cubications cc
    WHERE cc.contractor_id = p_contractor_id
      AND public.is_member_of_project(cc.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.attendance_records ar
    WHERE ar.contractor_id = p_contractor_id
      AND public.is_member_of_project(ar.project_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.labor_line_items lli
    JOIN public.payroll_periods pp ON pp.id = lli.payroll_period_id
    WHERE lli.contractor_id = p_contractor_id
      AND public.is_member_of_project(pp.project_id)
  );
$$;
REVOKE ALL ON FUNCTION public.current_user_sees_contractor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_sees_contractor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_sees_supplier(p_supplier_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- visible if the supplier appears under any project the caller can access
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.supplier_id = p_supplier_id
      AND public.is_member_of_project(t.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.supplier_id = p_supplier_id
      AND public.is_member_of_project(po.project_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.inventory_movements im
    WHERE im.supplier_id = p_supplier_id
      AND public.is_member_of_project(im.project_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.material_invoices mi
    JOIN public.payroll_periods pp ON pp.id = mi.payroll_period_id
    WHERE mi.supplier_id = p_supplier_id
      AND public.is_member_of_project(pp.project_id)
  );
$$;
REVOKE ALL ON FUNCTION public.current_user_sees_supplier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_sees_supplier(uuid) TO authenticated;

-- =====================================================================
-- 1) GLOBAL CONFIG (no per-tenant column) -> keep readable by all
--    authenticated users. These hold the role/capability matrix and the
--    shared materials catalog; they contain no company data, and the app
--    needs them on every screen to render permissions and pick lists.
--    We re-assert USING (true) explicitly (idempotent) to document the
--    decision rather than silently leaving the old policy in place.
-- =====================================================================

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.roles;
CREATE POLICY "rls_select_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.capabilities;
CREATE POLICY "rls_select_authenticated" ON public.capabilities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.role_capabilities;
CREATE POLICY "rls_select_authenticated" ON public.role_capabilities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.materials_catalog;
CREATE POLICY "rls_select_authenticated" ON public.materials_catalog
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- 2) TABLES WITH A DIRECT project_id COLUMN
--    USING (current_user_can_access_project(project_id))
--    (the helper already folds in the director bypass)
-- =====================================================================

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.transactions;
CREATE POLICY "rls_select_authenticated" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.payroll_periods;
CREATE POLICY "rls_select_authenticated" ON public.payroll_periods
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.attendance_records;
CREATE POLICY "rls_select_authenticated" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.bitacora_entries;
CREATE POLICY "rls_select_authenticated" ON public.bitacora_entries
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.quality_control;
CREATE POLICY "rls_select_authenticated" ON public.quality_control
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.schedule_tasks;
CREATE POLICY "rls_select_authenticated" ON public.schedule_tasks
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.partida_progress;
CREATE POLICY "rls_select_authenticated" ON public.partida_progress
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.budget_categories;
CREATE POLICY "rls_select_authenticated" ON public.budget_categories
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.budget_versions;
CREATE POLICY "rls_select_authenticated" ON public.budget_versions
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.expected_cash_inflows;
CREATE POLICY "rls_select_authenticated" ON public.expected_cash_inflows
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.purchase_orders;
CREATE POLICY "rls_select_authenticated" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.purchase_requisitions;
CREATE POLICY "rls_select_authenticated" ON public.purchase_requisitions
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.inventory_items;
CREATE POLICY "rls_select_authenticated" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.inventory_movements;
CREATE POLICY "rls_select_authenticated" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.adjustment_contracts;
CREATE POLICY "rls_select_authenticated" ON public.adjustment_contracts
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contract_cubications;
CREATE POLICY "rls_select_authenticated" ON public.contract_cubications
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.mercado_budgets;
CREATE POLICY "rls_select_authenticated" ON public.mercado_budgets
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

-- price_list_items is project-scoped (has project_id), not global config.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.price_list_items;
CREATE POLICY "rls_select_authenticated" ON public.price_list_items
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_project(project_id));

-- =====================================================================
-- 3) TABLES SCOPED VIA A PARENT (no own project_id) -> EXISTS subquery
--    to the parent that carries project_id (or to payroll_periods).
--    Director bypass added explicitly since these don't call the
--    project helper directly on a local column.
-- =====================================================================

-- budget_items -> budget_categories.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.budget_items;
CREATE POLICY "rls_select_authenticated" ON public.budget_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.budget_categories bc
      WHERE bc.id = budget_items.budget_category_id
        AND public.is_member_of_project(bc.project_id)
    )
  );

-- payroll-period children: indirect_costs, labor_line_items,
-- material_invoices, payment_distributions, loan_deductions
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.indirect_costs;
CREATE POLICY "rls_select_authenticated" ON public.indirect_costs
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.payroll_periods pp
      WHERE pp.id = indirect_costs.payroll_period_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.labor_line_items;
CREATE POLICY "rls_select_authenticated" ON public.labor_line_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.payroll_periods pp
      WHERE pp.id = labor_line_items.payroll_period_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.material_invoices;
CREATE POLICY "rls_select_authenticated" ON public.material_invoices
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.payroll_periods pp
      WHERE pp.id = material_invoices.payroll_period_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.payment_distributions;
CREATE POLICY "rls_select_authenticated" ON public.payment_distributions
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.payroll_periods pp
      WHERE pp.id = payment_distributions.payroll_period_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

-- loan_deductions has payroll_period_id (project path) -> use it.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.loan_deductions;
CREATE POLICY "rls_select_authenticated" ON public.loan_deductions
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.payroll_periods pp
      WHERE pp.id = loan_deductions.payroll_period_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

-- adjustment_contract children -> adjustment_contracts.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contract_adelantos;
CREATE POLICY "rls_select_authenticated" ON public.contract_adelantos
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.adjustment_contracts ac
      WHERE ac.id = contract_adelantos.contract_id
        AND public.is_member_of_project(ac.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contract_partidas;
CREATE POLICY "rls_select_authenticated" ON public.contract_partidas
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.adjustment_contracts ac
      WHERE ac.id = contract_partidas.contract_id
        AND public.is_member_of_project(ac.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contract_cortes;
CREATE POLICY "rls_select_authenticated" ON public.contract_cortes
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.adjustment_contracts ac
      WHERE ac.id = contract_cortes.contract_id
        AND public.is_member_of_project(ac.project_id)
    )
  );

-- mercado_budget_lines -> mercado_budgets.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.mercado_budget_lines;
CREATE POLICY "rls_select_authenticated" ON public.mercado_budget_lines
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.mercado_budgets mb
      WHERE mb.id = mercado_budget_lines.budget_id
        AND public.is_member_of_project(mb.project_id)
    )
  );

-- purchase_order_items -> purchase_orders.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.purchase_order_items;
CREATE POLICY "rls_select_authenticated" ON public.purchase_order_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND public.is_member_of_project(po.project_id)
    )
  );

-- purchase_quotes -> purchase_requisitions.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.purchase_quotes;
CREATE POLICY "rls_select_authenticated" ON public.purchase_quotes
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1 FROM public.purchase_requisitions pr
      WHERE pr.id = purchase_quotes.requisition_id
        AND public.is_member_of_project(pr.project_id)
    )
  );

-- purchase_quote_items -> purchase_quotes -> purchase_requisitions.project_id
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.purchase_quote_items;
CREATE POLICY "rls_select_authenticated" ON public.purchase_quote_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1
      FROM public.purchase_quotes pq
      JOIN public.purchase_requisitions pr ON pr.id = pq.requisition_id
      WHERE pq.id = purchase_quote_items.quote_id
        AND public.is_member_of_project(pr.project_id)
    )
  );

-- =====================================================================
-- 4) PROJECT-LESS REFERENCE TABLES scoped via visibility helpers
--    contractors / suppliers and their children.
-- =====================================================================

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contractors;
CREATE POLICY "rls_select_authenticated" ON public.contractors
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.current_user_sees_contractor(id)
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.suppliers;
CREATE POLICY "rls_select_authenticated" ON public.suppliers
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.current_user_sees_supplier(id)
  );

-- contractor children -> visible iff the parent contractor is visible
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contractor_documents;
CREATE POLICY "rls_select_authenticated" ON public.contractor_documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.current_user_sees_contractor(contractor_id)
  );

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.contractor_loans;
CREATE POLICY "rls_select_authenticated" ON public.contractor_loans
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.current_user_sees_contractor(contractor_id)
  );

-- =====================================================================
-- 5) IDENTITY / OWNERSHIP / SPECIAL CASES
-- =====================================================================

-- companies: director sees all; others see companies of projects they are in.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.companies;
CREATE POLICY "rls_select_authenticated" ON public.companies
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR id IN (SELECT company_id FROM public.user_companies())
  );

-- projects: director all; members of the project; or any project in a
-- company the user belongs to (so they can see sibling projects in-org).
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.projects;
CREATE POLICY "rls_select_authenticated" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.is_member_of_project(id)
    OR company_id IN (SELECT company_id FROM public.user_companies())
  );

-- project_members: director all; a user can see membership rows for any
-- project they themselves are a member of (so team lists render), plus
-- their own rows.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.project_members;
CREATE POLICY "rls_select_authenticated" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR user_id = (select auth.uid())
    OR public.is_member_of_project(project_id)
  );

-- user_profiles: director all; your own row; anyone who shares a project
-- (hence a company) with you, so names/avatars render across the app.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.user_profiles;
CREATE POLICY "rls_select_authenticated" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR id = (select auth.uid())
    OR id IN (
      SELECT pm.user_id
      FROM public.project_members pm
      WHERE public.is_member_of_project(pm.project_id)
    )
  );

-- push_subscriptions: only your own subscriptions (user_id is TEXT),
-- director may inspect all.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.push_subscriptions;
CREATE POLICY "rls_select_authenticated" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR user_id = (select auth.uid())::text
  );

-- approvals: polymorphic audit log (entity_type/entity_id, no project_id),
-- so a generic project join is not possible. Scope to director (full
-- audit access) or the acting user's own audit rows (actor_user_id TEXT).
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.approvals;
CREATE POLICY "rls_select_authenticated" ON public.approvals
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR actor_user_id = (select auth.uid())::text
  );
