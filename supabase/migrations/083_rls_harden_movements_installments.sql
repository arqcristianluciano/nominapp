-- =====================================================
-- NominApp - Migración 083: endurecer RLS de account_movements y loan_installments
-- Fecha: 2026-06-09
--
-- Problema detectado (auditoría de seguridad de Supabase):
--   Las tablas `account_movements` (079/081) y `loan_installments` (079) se
--   crearon con una política "Authenticated users full access" que usa
--   USING(true)/WITH CHECK(true) para FOR ALL. Eso permite que CUALQUIER
--   usuario autenticado lea, modifique o borre TODAS las filas, saltándose
--   el aislamiento por permisos (capacidades) que sí tiene el resto de la app.
--
-- Solución:
--   Alinear ambas tablas con sus tablas "padre", que ya usan permisos por rol:
--     • loan_installments  → mismo criterio que contractor_loans.
--     • account_movements  → mismo criterio que bank_accounts.
--
-- NOTAS DE DISEÑO:
--   - Idempotente: DROP POLICY IF EXISTS + CREATE.
--   - Ambas tablas están vacías hoy, así que no hay riesgo de pérdida de datos.
--   - Se conservan las capacidades ya usadas en migración 032/046.
-- =====================================================

-- ---------------------------------------------------------------------
-- 1) loan_installments  (hija de contractor_loans vía loan_id)
-- ---------------------------------------------------------------------
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access" ON public.loan_installments;

-- Lectura: director, o quien pueda ver el contratista dueño del préstamo,
-- o quien tenga permiso de escritura de préstamos (consistente con el padre).
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.loan_installments;
CREATE POLICY "rls_select_authenticated" ON public.loan_installments
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR public.user_has_capability_anywhere('write_loans')
    OR EXISTS (
      SELECT 1 FROM public.contractor_loans cl
      WHERE cl.id = loan_installments.loan_id
        AND public.current_user_sees_contractor(cl.contractor_id)
    )
  );

-- Escritura: igual que contractor_loans (capacidad write_loans).
DROP POLICY IF EXISTS "rls_write_loan_installments" ON public.loan_installments;
CREATE POLICY "rls_write_loan_installments" ON public.loan_installments
  FOR ALL TO authenticated
  USING (public.user_has_capability_anywhere('write_loans'))
  WITH CHECK (public.user_has_capability_anywhere('write_loans'));

-- ---------------------------------------------------------------------
-- 2) account_movements  (hija de bank_accounts vía account_id)
-- ---------------------------------------------------------------------
ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access" ON public.account_movements;

-- Lectura: mismo conjunto de permisos financieros que bank_accounts.
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.account_movements;
CREATE POLICY "rls_select_authenticated" ON public.account_movements
  FOR SELECT TO authenticated
  USING (
    public.user_has_capability_anywhere('write_bank_accounts')
    OR public.user_has_capability_anywhere('mark_paid')
    OR public.user_has_capability_anywhere('issue_check')
    OR public.user_has_capability_anywhere('write_contractors')
  );

-- Escritura: los movimientos se generan al desembolsar un préstamo
-- (write_loans), al cobrar una cuota (mark_paid) o como movimiento manual
-- de banco (write_bank_accounts). Permitimos esas tres rutas reales.
DROP POLICY IF EXISTS "rls_write_account_movements" ON public.account_movements;
CREATE POLICY "rls_write_account_movements" ON public.account_movements
  FOR ALL TO authenticated
  USING (
    public.user_has_capability_anywhere('write_bank_accounts')
    OR public.user_has_capability_anywhere('write_loans')
    OR public.user_has_capability_anywhere('mark_paid')
  )
  WITH CHECK (
    public.user_has_capability_anywhere('write_bank_accounts')
    OR public.user_has_capability_anywhere('write_loans')
    OR public.user_has_capability_anywhere('mark_paid')
  );
