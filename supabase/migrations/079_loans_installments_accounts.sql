-- =====================================================
-- NominApp - Migración 079: préstamos — cronograma de cuotas y cuentas
-- Fecha: 2026-06-07
-- Número provisional (renumerar al integrar con main donde ya existe 075_integrity_reinforcements.sql)
--
-- Agrega:
--   1. Columna `frecuencia` en contractor_loans (semanal/quincenal/mensual).
--   2. Columna `disbursement_account_id` en contractor_loans → FK → bank_accounts.
--   3. Tabla `loan_installments`: cronograma de cuotas con fecha, estado y cuenta.
--
-- NOTAS DE DISEÑO:
--   - La migración es ADITIVA e IDEMPOTENTE (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--   - El backfill de cuotas para préstamos EXISTENTES es OPCIONAL y está anotado
--     al final como bloque comentado; no se ejecuta aquí para no fabricar datos históricos.
--   - No existe aún un mecanismo centralizado de asientos/movimientos en cuenta.
--     Cuando exista, cada desembolso y cada cobro de cuota deberán generar el movimiento
--     correspondiente. Por ahora se registran las cuentas y fechas en las tablas para
--     facilitar la futura conciliación.
--   - Respeta el CHECK (amount > 0) de loan_deductions que establece 075_integrity_reinforcements.sql
--     (esta migración no toca loan_deductions).
-- =====================================================

-- -------------------------------------------------------
-- 1. Frecuencia de pago de cuotas en contractor_loans
-- -------------------------------------------------------
ALTER TABLE public.contractor_loans
  ADD COLUMN IF NOT EXISTS frecuencia text NOT NULL DEFAULT 'mensual';

-- Agregar constraint de dominio por separado (idempotente: si ya existe, ignorar error en app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contractor_loans'
      AND constraint_name = 'contractor_loans_frecuencia_check'
  ) THEN
    ALTER TABLE public.contractor_loans
      ADD CONSTRAINT contractor_loans_frecuencia_check
      CHECK (frecuencia IN ('semanal', 'quincenal', 'mensual'));
  END IF;
END$$;

-- -------------------------------------------------------
-- 2. Cuenta de desembolso (desde qué cuenta bancaria se entrega el préstamo)
-- -------------------------------------------------------
ALTER TABLE public.contractor_loans
  ADD COLUMN IF NOT EXISTS disbursement_account_id uuid NULL
  REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- 3. Tabla de cronograma de cuotas
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_installments (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id               uuid          NOT NULL
    REFERENCES public.contractor_loans(id) ON DELETE CASCADE,
  numero_cuota          integer       NOT NULL CHECK (numero_cuota >= 1),
  fecha_pago_programada date          NOT NULL,
  fecha_pago_real       date          NULL,
  monto                 numeric(15,2) NOT NULL CHECK (monto > 0),
  estado                text          NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagada')),
  -- Cuenta desde la que se recibe el cobro de esta cuota (para conciliación futura)
  cuenta_cobro_id       uuid          NULL
    REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT now(),

  -- Una cuota por número de cuota por préstamo
  UNIQUE (loan_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_id
  ON public.loan_installments (loan_id);

CREATE INDEX IF NOT EXISTS idx_loan_installments_pendientes
  ON public.loan_installments (loan_id, estado)
  WHERE estado = 'pendiente';

-- -------------------------------------------------------
-- RLS: mismo patrón que contractor_loans (acceso total a usuarios autenticados)
-- -------------------------------------------------------
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access" ON public.loan_installments;
CREATE POLICY "Authenticated users full access"
  ON public.loan_installments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- BACKFILL OPCIONAL — NO ejecutar en producción sin revisión manual previa
-- -------------------------------------------------------
-- Genera cronogramas para préstamos activos que todavía no tengan cuotas registradas.
-- Ejecutar manualmente y solo después de validar los datos.
--
-- INSERT INTO public.loan_installments
--   (loan_id, numero_cuota, fecha_pago_programada, monto)
-- SELECT
--   l.id,
--   n.numero_cuota,
--   CASE l.frecuencia
--     WHEN 'semanal'   THEN l.disbursed_date + (n.numero_cuota * 7)
--     WHEN 'quincenal' THEN l.disbursed_date + (n.numero_cuota * 15)
--     ELSE (l.disbursed_date + make_interval(months => n.numero_cuota))::date
--   END AS fecha_pago_programada,
--   l.installment_amount AS monto
-- FROM public.contractor_loans l
-- CROSS JOIN LATERAL generate_series(1, l.installments) AS n(numero_cuota)
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.loan_installments li WHERE li.loan_id = l.id
-- )
-- AND l.status = 'active';
