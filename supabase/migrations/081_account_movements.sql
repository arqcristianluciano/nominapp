-- =====================================================
-- NominApp - Migración 081: tabla account_movements (movimientos de cuenta)
-- Fecha: 2026-06-07
-- Número provisional (renumerar al integrar con main; 080 podría existir en otra rama).
--
-- Objetivo:
--   Registrar cada movimiento de dinero (entrada o salida) en una cuenta bancaria
--   de la empresa, de forma que se pueda calcular el saldo por cuenta y conciliar
--   con los préstamos otorgados (desembolsos) y los cobros de cuotas.
--
-- Movimientos generados automáticamente:
--   • Al crear un préstamo con disbursement_account_id → salida por el principal.
--   • Al marcar una cuota como pagada con cuenta_cobro_id → entrada por el monto.
--   Los movimientos se crean desde loanService (capa de aplicación) en la misma
--   operación, no mediante triggers, para mantener la lógica visible y testeble.
--
-- NOTAS DE DISEÑO:
--   - Aditiva e idempotente (CREATE TABLE IF NOT EXISTS).
--   - RLS: mismo patrón que loan_installments (acceso total a usuarios autenticados).
--   - El campo `origen` sirve para filtrar/identificar la fuente del movimiento.
--   - `referencia_id` apunta al id de la fila que originó el movimiento
--     (contractor_loans.id o loan_installments.id).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.account_movements (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid          NOT NULL
    REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  fecha           date          NOT NULL,
  -- 'debito'  = salida de dinero de la cuenta (ej: desembolso de préstamo)
  -- 'credito' = entrada de dinero a la cuenta (ej: cobro de cuota)
  tipo            text          NOT NULL
    CHECK (tipo IN ('debito', 'credito')),
  monto           numeric(15,2) NOT NULL CHECK (monto > 0),
  concepto        text          NOT NULL,
  -- Identifica la fuente: 'loan_disbursement' | 'loan_repayment' | 'manual'
  origen          text          NOT NULL DEFAULT 'manual',
  -- UUID de la fila que originó el movimiento (loan o installment); nullable
  referencia_id   uuid          NULL,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes (saldo por cuenta, historial por fecha)
CREATE INDEX IF NOT EXISTS idx_account_movements_account_id
  ON public.account_movements (account_id);

CREATE INDEX IF NOT EXISTS idx_account_movements_account_fecha
  ON public.account_movements (account_id, fecha DESC);

-- RLS: mismo patrón que loan_installments y contractor_loans
ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access" ON public.account_movements;
CREATE POLICY "Authenticated users full access"
  ON public.account_movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
