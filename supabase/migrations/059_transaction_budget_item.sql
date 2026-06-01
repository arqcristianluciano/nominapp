-- Migration 052: imputación de transacciones (CxP) a una partida del presupuesto
--
-- La tabla `transactions` (cuentas por pagar / diario) solo permitía imputar a
-- capítulo (`budget_category_id`). Para poder reportar el costo real por partida
-- agregamos `budget_item_id`, opcional, con FK a `budget_items`.
--
-- La columna es nullable (la imputación a partida es opcional, igual que en
-- labor_line_items y material_invoices). FK ON DELETE SET NULL: borrar una
-- partida no debe borrar el asiento contable, solo desvincularlo.
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS y guarda el FK/índice con lookups
-- de catálogo, siguiendo el patrón de migraciones previas (033, 047).

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS budget_item_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.transactions'::regclass
      AND conname  = 'transactions_budget_item_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_budget_item_id_fkey
      FOREIGN KEY (budget_item_id)
      REFERENCES public.budget_items (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_item_id
  ON public.transactions (budget_item_id);

COMMENT ON COLUMN public.transactions.budget_item_id IS
  'Partida del presupuesto a la que se imputa la transacción (opcional). El capítulo se guarda en budget_category_id.';

COMMIT;
