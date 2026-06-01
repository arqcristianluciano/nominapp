-- Migration 058: endurecer la edición de partidas de nómina a "autor o Director"
--
-- Hasta ahora, la escritura en labor_line_items y material_invoices se regía por
-- una sola política FOR ALL con `can_edit_payroll_period(payroll_period_id)`:
-- cualquiera con permiso de edición sobre el período podía editar/borrar líneas
-- de OTRO usuario. La columna created_by (migración previa) registra al autor;
-- aquí la usamos para restringir UPDATE/DELETE a autor o Director.
--
-- Diseño:
--  - INSERT: igual que antes (quien puede editar el período).
--  - UPDATE/DELETE: además, autor (created_by = uid) o Director.
--  - Salvedad: las filas históricas con created_by NULL siguen editables por
--    quien puede editar el período (no se bloquea data anterior al created_by).
--  - auth.uid() y current_user_is_director() envueltos en (select ...) para no
--    reevaluarlos por fila.
--
-- Efecto secundario positivo: al separar FOR ALL en INSERT/UPDATE/DELETE se
-- elimina el solapamiento con la política de SELECT (advisor "Multiple
-- Permissive Policies") en estas dos tablas.
--
-- Idempotente: DROP POLICY IF EXISTS antes de crear.

BEGIN;

-- ───────────── labor_line_items ─────────────
DROP POLICY IF EXISTS rls_write_labor_line_items ON public.labor_line_items;
DROP POLICY IF EXISTS rls_insert_labor_line_items ON public.labor_line_items;
DROP POLICY IF EXISTS rls_update_labor_line_items ON public.labor_line_items;
DROP POLICY IF EXISTS rls_delete_labor_line_items ON public.labor_line_items;

CREATE POLICY rls_insert_labor_line_items ON public.labor_line_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY rls_update_labor_line_items ON public.labor_line_items
  FOR UPDATE TO authenticated
  USING (
    public.can_edit_payroll_period(payroll_period_id)
    AND (
      created_by IS NULL
      OR created_by = (select auth.uid())
      OR (select public.current_user_is_director())
    )
  )
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY rls_delete_labor_line_items ON public.labor_line_items
  FOR DELETE TO authenticated
  USING (
    public.can_edit_payroll_period(payroll_period_id)
    AND (
      created_by IS NULL
      OR created_by = (select auth.uid())
      OR (select public.current_user_is_director())
    )
  );

-- ───────────── material_invoices ─────────────
DROP POLICY IF EXISTS rls_write_material_invoices ON public.material_invoices;
DROP POLICY IF EXISTS rls_insert_material_invoices ON public.material_invoices;
DROP POLICY IF EXISTS rls_update_material_invoices ON public.material_invoices;
DROP POLICY IF EXISTS rls_delete_material_invoices ON public.material_invoices;

CREATE POLICY rls_insert_material_invoices ON public.material_invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY rls_update_material_invoices ON public.material_invoices
  FOR UPDATE TO authenticated
  USING (
    public.can_edit_payroll_period(payroll_period_id)
    AND (
      created_by IS NULL
      OR created_by = (select auth.uid())
      OR (select public.current_user_is_director())
    )
  )
  WITH CHECK (public.can_edit_payroll_period(payroll_period_id));

CREATE POLICY rls_delete_material_invoices ON public.material_invoices
  FOR DELETE TO authenticated
  USING (
    public.can_edit_payroll_period(payroll_period_id)
    AND (
      created_by IS NULL
      OR created_by = (select auth.uid())
      OR (select public.current_user_is_director())
    )
  );

COMMIT;
