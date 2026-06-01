-- Migration 056: garantizar coherencia capítulo/partida en transacciones (CxP)
--
-- `transactions.budget_category_id` (capítulo) y `budget_item_id` (partida) son
-- columnas independientes. La UI las mantiene coherentes (al cambiar capítulo se
-- limpia la partida), pero la base permitía estados inconsistentes vía import o
-- edición directa: una transacción imputada a una partida que pertenece a OTRO
-- capítulo. Eso ensuciaría el costo real por partida y por capítulo.
--
-- Este trigger hace que la partida sea autoritativa: si la transacción tiene
-- `budget_item_id`, el `budget_category_id` se fuerza al capítulo real de esa
-- partida. Nunca rechaza la escritura (no rompe imports); solo corrige la
-- incoherencia de forma silenciosa y correcta.
--
-- Idempotente: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS. No toca
-- filas existentes (los triggers solo disparan en INSERT/UPDATE futuros), y la
-- columna es reciente (migración 052) por lo que no hay histórico inconsistente.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_transaction_partida_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  item_category uuid;
BEGIN
  IF NEW.budget_item_id IS NOT NULL THEN
    SELECT budget_category_id INTO item_category
    FROM public.budget_items
    WHERE id = NEW.budget_item_id;
    -- La partida manda: el capítulo de la transacción es el de su partida.
    NEW.budget_category_id := item_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_transaction_partida_category ON public.transactions;

CREATE TRIGGER trg_enforce_transaction_partida_category
  BEFORE INSERT OR UPDATE OF budget_item_id, budget_category_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transaction_partida_category();

COMMIT;
