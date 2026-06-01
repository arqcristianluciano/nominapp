-- =====================================================================
-- 058 - RLS server-side: edicion de nomina por etapa
-- ---------------------------------------------------------------------
-- Lleva al SERVIDOR la regla de edicion que hoy solo vive en el cliente
-- (src/utils/payrollItemPermissions.ts -> canEditPayrollItems, "opcion A").
-- La migracion 052_payroll_item_created_by.sql dejo explicitamente esta
-- restriccion a nivel RLS como "follow-up"; esto la implementa.
--
-- Problema que cierra:
--   Las tablas de contenido del reporte (labor_line_items, material_invoices,
--   indirect_costs, material_invoice_items) permitian ESCRITURA a cualquier
--   usuario con la capability `edit_payroll`, sin mirar el estado del reporte.
--   A nivel de API eso permitia editar un reporte ya enviado, aprobado o
--   pagado: el bloqueo por etapa solo existia en la UI.
--
-- Regla (identica a la UI):
--   * BORRADOR (draft): edita quien captura los datos (`edit_payroll`).
--   * ENVIADO / APROBADO / PAGADO: solo la mayor jerarquia (`approve_payroll`),
--     que ademas puede editar en cualquier estado.
--
-- Implementacion:
--   Se reemplazan TODAS las politicas de ESCRITURA (cualquier comando que no
--   sea SELECT) de las 4 tablas por UNA sola politica con gate por etapa via
--   can_edit_payroll_period(). El barrido es dinamico (por comando) a proposito:
--   asi no sobrevive ninguna politica permisiva paralela -sin importar su
--   nombre historico- que, al combinarse por OR, pudiera burlar el gate. Esto
--   incluye, entre otras: 001 "Users can insert/update/delete ...",
--   044 labor_line_items_modify, 048 rls_write_*, 051 material_invoice_items_write.
--   Las politicas de LECTURA (SELECT) NO se tocan (001 "Users can view ...",
--   043 rls_read_*, 051 material_invoice_items_read), por lo que la lectura
--   sigue intacta.
--
-- Idempotente y seguro en una DB sin la feature de items (guarda to_regclass).
-- =====================================================================

-- 1) Helper: el usuario puede editar el contenido del reporte segun la etapa.
--    SECURITY DEFINER + search_path fijo. La mayor jerarquia (Director / quien
--    aprueba) entra por user_has_capability('approve_payroll').
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

-- 2) Barrer TODAS las politicas de escritura (no-SELECT) de las 4 tablas, sin
--    importar su nombre. Las de lectura (SELECT) se conservan.
DO $$
DECLARE
  v_table text;
  v_pol   text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'labor_line_items', 'material_invoices', 'indirect_costs', 'material_invoice_items'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      CONTINUE;  -- tabla no presente en esta DB (p. ej. items sin la 051)
    END IF;
    FOR v_pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_table AND cmd <> 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol, v_table);
    END LOOP;
  END LOOP;
END $$;

-- 3) Una unica politica de escritura con gate por etapa en cada tabla.
CREATE POLICY "rls_write_labor_line_items" ON public.labor_line_items
  FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY "rls_write_material_invoices" ON public.material_invoices
  FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY "rls_write_indirect_costs" ON public.indirect_costs
  FOR ALL TO authenticated
  USING (public.can_edit_payroll_period(payroll_period_id))
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

-- material_invoice_items: mismo gate por etapa, via la factura padre.
DO $$
BEGIN
  IF to_regclass('public.material_invoice_items') IS NOT NULL THEN
    EXECUTE $pol$
      CREATE POLICY "rls_write_material_invoice_items" ON public.material_invoice_items
        FOR ALL TO authenticated
        USING (public.can_edit_payroll_period(
          (SELECT mi.payroll_period_id FROM public.material_invoices mi
            WHERE mi.id = material_invoice_id)))
        WITH CHECK (public.can_edit_payroll_period(
          (SELECT mi.payroll_period_id FROM public.material_invoices mi
            WHERE mi.id = material_invoice_id)))
    $pol$;
  END IF;
END $$;
