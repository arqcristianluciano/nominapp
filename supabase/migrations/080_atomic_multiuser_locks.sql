-- =====================================================
-- NominApp - Migración 080: candados atómicos multiusuario
-- Fecha: 2026-06-07
-- Número provisional 080 (renumerar al integrar).
--
-- Implementa tres refuerzos de integridad concurrente:
--   1. RPC `rpc_inventory_add_movement`: inserta movimiento + actualiza stock
--      y costo promedio ponderado en una sola transacción SERIALIZABLE.
--      Rechaza stock negativo salvo override explícito.
--   2. RPC `rpc_increment_payment_amount`: incrementa payment_distributions.amount
--      de forma atómica con verificación del tope del período.
--   3. Columna `deducted_amount` en contract_adelantos: saldo ya descontado en
--      nóminas previas, para ofrecer solo el saldo pendiente al vincular cortes.
--
-- NOTAS DE DISEÑO:
--   - Aditivas e idempotentes (OR REPLACE / IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--   - NO aplica cambios de datos; solo DDL y funciones.
--   - Las RPCs corren con SECURITY DEFINER para poder bloquear la fila con FOR UPDATE.
--   - SET search_path = '' fuerza a calificar todos los objetos (seguridad RLS).
-- =====================================================

-- -------------------------------------------------------
-- 1. RPC atómica de movimiento de inventario
-- -------------------------------------------------------
--
-- Parámetros (todos los que acepta inventoryService.addMovement):
--   p_item_id            uuid        — material
--   p_project_id         uuid        — proyecto
--   p_type               text        — 'in' | 'out'
--   p_quantity           numeric     — siempre positivo
--   p_date               date        — fecha del movimiento
--   p_notes              text        — opcional
--   p_supplier_id        uuid        — opcional
--   p_budget_item_id     uuid        — obligatorio en salidas
--   p_budget_category_id uuid        — alternativa a p_budget_item_id en salidas
--   p_purchase_order_id  uuid        — opcional
--   p_unit_cost          numeric     — costo unitario (usado en entradas para WAC)
--   p_created_by         text        — usuario que registra
--   p_lot_id             uuid        — lote de entrada (opcional)
--   p_attachment_path    text        — ruta del conduce (opcional)
--   p_override_motivo    text        — motivo del override (NULL = sin override)
--
-- Devuelve: id uuid del movimiento insertado.
-- Lanza:
--   SQLSTATE P0001 'INSUFFICIENT_STOCK'  — stock quedaría negativo sin override.
--   SQLSTATE P0001 'OUT_REQUIRES_PARTIDA'— salida sin partida presupuestaria.
--   SQLSTATE P0001 'ITEM_NOT_FOUND'      — material no existe.
--   SQLSTATE P0001 'INVALID_QUANTITY'    — cantidad <= 0.

CREATE OR REPLACE FUNCTION public.rpc_inventory_add_movement(
  p_item_id            uuid,
  p_project_id         uuid,
  p_type               text,
  p_quantity           numeric,
  p_date               date,
  p_notes              text        DEFAULT NULL,
  p_supplier_id        uuid        DEFAULT NULL,
  p_budget_item_id     uuid        DEFAULT NULL,
  p_budget_category_id uuid        DEFAULT NULL,
  p_purchase_order_id  uuid        DEFAULT NULL,
  p_unit_cost          numeric     DEFAULT NULL,
  p_created_by         text        DEFAULT NULL,
  p_lot_id             uuid        DEFAULT NULL,
  p_attachment_path    text        DEFAULT NULL,
  p_override_motivo    text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item           public.inventory_items%ROWTYPE;
  v_current_stock  numeric;
  v_current_cost   numeric;
  v_delta          numeric;
  v_new_stock      numeric;
  v_next_cost      numeric;
  v_movement_id    uuid;
BEGIN
  -- Validar cantidad
  IF NOT (p_quantity > 0) THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: La cantidad del movimiento debe ser mayor que cero.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validar partida en salidas
  IF p_type = 'out' AND p_budget_item_id IS NULL AND p_budget_category_id IS NULL THEN
    RAISE EXCEPTION 'OUT_REQUIRES_PARTIDA: Toda salida de almacén debe imputarse a una partida del presupuesto.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Bloquear la fila del material para serializar acceso concurrente
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: Material no encontrado.'
      USING ERRCODE = 'P0001';
  END IF;

  v_current_stock := COALESCE(v_item.current_stock, 0);
  v_current_cost  := COALESCE(v_item.unit_cost, 0);
  v_delta         := CASE p_type WHEN 'in' THEN p_quantity ELSE -p_quantity END;
  v_new_stock     := v_current_stock + v_delta;

  -- Bloquear stock negativo salvo override
  IF v_new_stock < 0 AND p_override_motivo IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Stock insuficiente: disponible %, solicitado %.',
      v_current_stock, p_quantity
      USING ERRCODE = 'P0001';
  END IF;

  -- Insertar el movimiento
  INSERT INTO public.inventory_movements (
    item_id, project_id, type, quantity, date,
    notes, supplier_id, budget_item_id, budget_category_id,
    purchase_order_id, unit_cost, created_by, lot_id,
    attachment_path, override_motivo, created_at
  ) VALUES (
    p_item_id, p_project_id, p_type, p_quantity, p_date,
    p_notes, p_supplier_id, p_budget_item_id, p_budget_category_id,
    p_purchase_order_id, p_unit_cost, p_created_by, p_lot_id,
    p_attachment_path, p_override_motivo, now()
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular costo promedio ponderado (solo en entradas con costo válido)
  v_next_cost := v_current_cost;
  IF p_type = 'in' AND p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
    IF (v_current_stock + p_quantity) > 0 THEN
      v_next_cost := (v_current_stock * v_current_cost + p_quantity * p_unit_cost)
                    / (v_current_stock + p_quantity);
    ELSE
      v_next_cost := p_unit_cost;
    END IF;
  END IF;

  -- Actualizar stock y costo en una sola sentencia atómica
  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      unit_cost     = v_next_cost
  WHERE id = p_item_id;

  RETURN v_movement_id;
END;
$$;

-- Permisos: solo usuarios autenticados pueden invocar la RPC
REVOKE ALL ON FUNCTION public.rpc_inventory_add_movement(
  uuid, uuid, text, numeric, date,
  text, uuid, uuid, uuid, uuid,
  numeric, text, uuid, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_add_movement(
  uuid, uuid, text, numeric, date,
  text, uuid, uuid, uuid, uuid,
  numeric, text, uuid, text, text
) TO authenticated;


-- -------------------------------------------------------
-- 2. RPC atómica de incremento de monto de distribución de pago
-- -------------------------------------------------------
--
-- Parámetros:
--   p_id              uuid    — id de la fila en payment_distributions
--   p_delta           numeric — monto a sumar (debe ser > 0)
--   p_period_cap      numeric — tope del período (NULL = sin verificación)
--
-- Devuelve: la fila completa actualizada como JSON.
-- Lanza:
--   SQLSTATE P0001 'DELTA_NOT_POSITIVE'  — delta <= 0.
--   SQLSTATE P0001 'PAYMENT_NOT_FOUND'   — fila no encontrada.
--   SQLSTATE P0001 'EXCEEDS_PERIOD_CAP'  — suma superaría el tope del período.

CREATE OR REPLACE FUNCTION public.rpc_increment_payment_amount(
  p_id         uuid,
  p_delta      numeric,
  p_period_cap numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row        public.payment_distributions%ROWTYPE;
  v_other_sum  numeric;
  v_new_amount numeric;
  v_result     json;
BEGIN
  IF NOT (p_delta > 0) THEN
    RAISE EXCEPTION 'DELTA_NOT_POSITIVE: El monto a sumar debe ser mayor que cero.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Bloquear la fila de destino para serializar escrituras concurrentes
  SELECT * INTO v_row
  FROM public.payment_distributions
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND: No se encontró el pago a consolidar.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar tope del período si se indicó
  IF p_period_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_other_sum
    FROM public.payment_distributions
    WHERE payroll_period_id = v_row.payroll_period_id
      AND status <> 'cancelled'
      AND id <> p_id;

    IF v_other_sum + v_row.amount + p_delta > p_period_cap + 0.0001 THEN
      RAISE EXCEPTION 'EXCEEDS_PERIOD_CAP: El monto excede el total pendiente por distribuir.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Calcular y aplicar el nuevo monto
  v_new_amount := ROUND((v_row.amount + p_delta)::numeric, 2);

  UPDATE public.payment_distributions
  SET amount = v_new_amount
  WHERE id = p_id
  RETURNING row_to_json(payment_distributions.*) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_increment_payment_amount(uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_increment_payment_amount(uuid, numeric, numeric) TO authenticated;


-- -------------------------------------------------------
-- 3. Columna deducted_amount en contract_adelantos
-- -------------------------------------------------------
--
-- Registra cuánto de este adelanto ya fue descontado en nóminas anteriores.
-- El valor nunca puede ser negativo ni superar el monto original del adelanto.
-- La app actualiza este campo al vincular un corte con deducción de adelantos.

ALTER TABLE public.contract_adelantos
  ADD COLUMN IF NOT EXISTS deducted_amount numeric NOT NULL DEFAULT 0;

-- Constraint: el saldo descontado no puede ser negativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contract_adelantos'
      AND constraint_name = 'contract_adelantos_deducted_amount_non_negative'
  ) THEN
    ALTER TABLE public.contract_adelantos
      ADD CONSTRAINT contract_adelantos_deducted_amount_non_negative
      CHECK (deducted_amount >= 0);
  END IF;
END$$;

-- Constraint: el saldo descontado no puede superar el monto del adelanto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contract_adelantos'
      AND constraint_name = 'contract_adelantos_deducted_not_exceeds_amount'
  ) THEN
    ALTER TABLE public.contract_adelantos
      ADD CONSTRAINT contract_adelantos_deducted_not_exceeds_amount
      CHECK (deducted_amount <= amount);
  END IF;
END$$;
