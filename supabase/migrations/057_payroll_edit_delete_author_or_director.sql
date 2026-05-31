-- 057_payroll_edit_delete_author_or_director
-- Follow-up de 052_payroll_item_created_by (que dejó esta restricción pendiente).
--
-- QUÉ HACE (en negocio): a partir de ahora, un renglón del reporte de obra
-- (mano de obra o factura de materiales) solo lo puede EDITAR o BORRAR la
-- persona que lo creó (su autor) o un Director. AGREGAR renglones nuevos sigue
-- abierto a cualquiera que pueda trabajar ese período (igual que antes).
--
-- CÓMO: se separa la antigua política única de escritura (rls_write_*, FOR ALL)
-- en tres políticas (INSERT / UPDATE / DELETE). Se conserva la regla de etapa
-- existente can_edit_payroll_period() como base, y en UPDATE/DELETE se exige
-- además ser el autor (created_by = auth.uid()) o un Director
-- (current_user_is_director()).
--
-- NOTA: las filas anteriores a la 052 tienen created_by NULL (autor desconocido);
-- por seguridad, esas solo las podrá editar/borrar un Director.
--
-- Se usa (select auth.uid()) en vez de auth.uid() por rendimiento (RLS initplan).

-- ============ labor_line_items (mano de obra) ============
DROP POLICY IF EXISTS rls_write_labor_line_items ON public.labor_line_items;

CREATE POLICY rls_insert_labor_line_items
  ON public.labor_line_items
  FOR INSERT TO authenticated
  WITH CHECK ( can_edit_payroll_period(payroll_period_id) );

CREATE POLICY rls_update_labor_line_items
  ON public.labor_line_items
  FOR UPDATE TO authenticated
  USING (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  )
  WITH CHECK (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  );

CREATE POLICY rls_delete_labor_line_items
  ON public.labor_line_items
  FOR DELETE TO authenticated
  USING (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  );

-- ============ material_invoices (facturas de materiales) ============
DROP POLICY IF EXISTS rls_write_material_invoices ON public.material_invoices;

CREATE POLICY rls_insert_material_invoices
  ON public.material_invoices
  FOR INSERT TO authenticated
  WITH CHECK ( can_edit_payroll_period(payroll_period_id) );

CREATE POLICY rls_update_material_invoices
  ON public.material_invoices
  FOR UPDATE TO authenticated
  USING (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  )
  WITH CHECK (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  );

CREATE POLICY rls_delete_material_invoices
  ON public.material_invoices
  FOR DELETE TO authenticated
  USING (
    can_edit_payroll_period(payroll_period_id)
    AND ( created_by = (select auth.uid()) OR current_user_is_director() )
  );
