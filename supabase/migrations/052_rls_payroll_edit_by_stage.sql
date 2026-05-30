-- =====================================================================
-- 052 - RLS: edicion de nomina por etapa (alineada con la app / opcion A)
-- ---------------------------------------------------------------------
-- Refuerza en el servidor la regla de edicion de reportes de nomina. Hasta
-- ahora el bloqueo por estado vivia solo en el cliente; la RLS de las tablas
-- de contenido del reporte exigia unicamente `edit_payroll`, sin mirar el
-- estado, permitiendo a nivel de API editar un reporte ya aprobado.
--
-- Regla (identica a utils/payrollItemPermissions.ts -> canEditPayrollItems):
--   * BORRADOR (draft): edita quien captura los datos (`edit_payroll`).
--   * ENVIADO / APROBADO / PAGADO: solo la mayor jerarquia (`approve_payroll`),
--     que ademas puede editar en cualquier estado.
--
-- Aplica a labor_line_items, material_invoices, indirect_costs y, si existe,
-- material_invoice_items (renglones de factura).
--
-- Idempotente: CREATE OR REPLACE + DROP POLICY IF EXISTS.
-- =====================================================================

-- Helper: el usuario puede editar el contenido del reporte segun su etapa.
-- Director bypassea via user_has_capability (current_user_is_director()).
CREATE OR REPLACE FUNCTION public.can_edit_payroll_period(p_payroll_period_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payroll_periods pp
    WHERE pp.id = p_payroll_period_id
      AND (
        (pp.status = 'draft'
           AND public.user_has_any_capability(pp.project_id, 'edit_payroll', 'approve_payroll'))
        OR
        (pp.status IN ('submitted', 'approved', 'paid')
           AND public.user_has_capability(pp.project_id, 'approve_payroll'))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_edit_payroll_period(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_edit_payroll_period(uuid) TO authenticated;

-- labor_line_items
DROP POLICY IF EXISTS "rls_write_labor_line_items" ON public.labor_line_items;
CREATE POLICY "rls_write_labor_line_items" ON public.labor_line_items FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

-- material_invoices
DROP POLICY IF EXISTS "rls_write_material_invoices" ON public.material_invoices;
CREATE POLICY "rls_write_material_invoices" ON public.material_invoices FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

-- indirect_costs
DROP POLICY IF EXISTS "rls_write_indirect_costs" ON public.indirect_costs;
CREATE POLICY "rls_write_indirect_costs" ON public.indirect_costs FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

-- material_invoice_items (renglones de factura): misma regla por etapa que la
-- factura padre. Guardado por si la tabla no existe en una DB sin esa feature.
DO $$
BEGIN
  IF to_regclass('public.material_invoice_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "rls_write_material_invoice_items" ON public.material_invoice_items';
    EXECUTE $pol$
      CREATE POLICY "rls_write_material_invoice_items" ON public.material_invoice_items FOR ALL TO authenticated
        USING (public.can_edit_payroll_period(
          (SELECT mi.payroll_period_id FROM public.material_invoices mi WHERE mi.id = material_invoice_id)))
        WITH CHECK (public.can_edit_payroll_period(
          (SELECT mi.payroll_period_id FROM public.material_invoices mi WHERE mi.id = material_invoice_id)))
    $pol$;
  END IF;
END $$;
