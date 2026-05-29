-- 056_payroll_item_author_rls
-- Endurece la RLS de ESCRITURA de partidas de mano de obra y facturas de
-- materiales: corregir o borrar un renglón solo lo puede
--   * su AUTOR (created_by = auth.uid()), o
--   * la mayor jerarquía (capability `approve_payroll`, p. ej. Director).
--
-- Antes (mig. 029) la política era FOR ALL y cualquiera con `edit_payroll` en
-- el proyecto podía UPDATE/DELETE cualquier renglón. Aquí se separa por comando:
--   * INSERT → requiere `edit_payroll` (quien arma el reporte puede agregar).
--   * UPDATE → autor o `approve_payroll`.
--   * DELETE → autor o `approve_payroll`.
-- SELECT NO se toca (lo cubre `rls_select_authenticated`, mig. 043).
--
-- Depende de la columna `created_by` (mig. 052_payroll_item_created_by).
-- Filas legadas con created_by NULL solo las podrá editar la mayor jerarquía.
--
-- ⚠️ VALIDAR EN SUPABASE ANTES DE APLICAR: no se pudo probar contra una base
-- real desde el entorno donde se generó esta migración.
--
-- Notas de alcance:
--  * La UI ya restringe (opción A) la edición de reportes COMPROMETIDOS a la
--    mayor jerarquía. Para alinear el caso "borrador editado por un no-autor",
--    la UI debería además considerar la autoría cuando haya auth real (el modo
--    demo no expone auth.uid()).
--  * Los ítems de factura (`material_invoice_items`, mig. 051) no tienen autor
--    propio y conservan su política actual; revisar en un follow-up si se desea
--    heredar la regla de autoría del encabezado.

-- === labor_line_items ===
DROP POLICY IF EXISTS "rls_write_labor_line_items" ON public.labor_line_items;

CREATE POLICY "rls_insert_labor_line_items" ON public.labor_line_items
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'));

CREATE POLICY "rls_update_labor_line_items" ON public.labor_line_items
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  );

CREATE POLICY "rls_delete_labor_line_items" ON public.labor_line_items
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  );

-- === material_invoices ===
DROP POLICY IF EXISTS "rls_write_material_invoices" ON public.material_invoices;

CREATE POLICY "rls_insert_material_invoices" ON public.material_invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_capability(public._project_of_payroll(payroll_period_id), 'edit_payroll'));

CREATE POLICY "rls_update_material_invoices" ON public.material_invoices
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  );

CREATE POLICY "rls_delete_material_invoices" ON public.material_invoices
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.user_has_capability(public._project_of_payroll(payroll_period_id), 'approve_payroll')
  );
