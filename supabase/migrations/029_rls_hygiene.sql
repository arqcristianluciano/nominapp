-- =====================================================================
-- 026 - RLS hygiene: tras 025 quedan policies legacy + helpers SECURITY
--       DEFINER ejecutables por anon. Limpia ambas cosas.
-- =====================================================================

-- 1) Policies legacy "allow_all_*" creadas antes de 022 que volvieron
--    permisivo el acceso a OC/items. Las eliminamos: la policy estricta
--    de 025 ya gobierna purchase_orders.
DROP POLICY IF EXISTS "allow_all_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "allow_all_purchase_order_items" ON public.purchase_order_items;

-- 2) Policy duplicada en approvals: 025 ya creó rls_insert_approvals.
DROP POLICY IF EXISTS "authenticated_insert_approvals" ON public.approvals;

-- 3) Helpers SECURITY DEFINER no deben ser ejecutables por anon ni por
--    public. authenticated los necesita para las policies. Revocamos y
--    re-grantamos.
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'current_user_is_director',
        'current_user_can_access_project',
        'current_user_has_role',
        'is_member_of_project',
        'auto_assign_project_creator',
        'user_has_project_role',
        'user_has_any_role_anywhere',
        '_project_of_budget_category',
        '_project_of_payroll',
        '_project_of_contract',
        '_project_of_requisition',
        '_project_of_quote',
        '_project_of_purchase_order',
        '_project_of_mercado_budget'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC',  r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon',    r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $do$;
