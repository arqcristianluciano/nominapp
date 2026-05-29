-- =====================================================================
-- 052 - RLS: edicion de nomina por etapa (introduccion de datos vs aprobado)
-- ---------------------------------------------------------------------
-- Refuerza en el servidor la regla de negocio de edicion de reportes de
-- nomina. Hasta ahora el bloqueo por estado vivia solo en el cliente
-- (flag canEdit en el editor); la RLS de las tablas de contenido del
-- reporte exigia unicamente la capability `edit_payroll`, sin mirar el
-- estado del periodo. Esto permitia, a nivel de API, que un usuario con
-- `edit_payroll` pero sin autorizacion editara un reporte ya aprobado.
--
-- Regla (identica a utils/payrollItemPermissions.ts -> canEditPayrollItems):
--   * Etapa de introduccion de datos (status: draft, submitted):
--       escribe quien captura los datos (`edit_payroll`) y tambien los
--       usuarios autorizados (`approve_payroll`).
--   * Tras la aprobacion (status: approved, paid):
--       solo usuarios autorizados (`approve_payroll`).
--
-- Aplica a las tablas de contenido del reporte: labor_line_items,
-- material_invoices e indirect_costs. El recalculo de totales/indirectos
-- y el vinculo de cortes de cubicacion operan sobre estas mismas tablas,
-- por lo que un usuario autorizado conserva la capacidad de operar sobre
-- un reporte aprobado. payroll_periods conserva su policy (la transicion
-- de estados y el guardado de totales siguen disponibles para los caps de
-- nomina).
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
        (pp.status IN ('draft', 'submitted')
           AND public.user_has_any_capability(pp.project_id, 'edit_payroll', 'approve_payroll'))
        OR
        (pp.status IN ('approved', 'paid')
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
