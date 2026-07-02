-- =====================================================
-- 093 — Refuerzo de permisos en funciones del servidor (RPC) y catálogo
--
-- PROBLEMA (auditoría 2026-07-02):
--   Las funciones RPC `rpc_inventory_add_movement` y `rpc_increment_payment_amount`
--   corren como SECURITY DEFINER (con privilegios elevados) y por tanto SALTAN
--   las reglas de fila (RLS) de sus tablas. Como no verificaban permisos por
--   dentro y estaban otorgadas a `anon`/`public`, cualquiera podía:
--     - registrar entradas/salidas de almacén y alterar stock/costo de cualquier
--       proyecto (e imputar gasto al presupuesto ajeno), incluso sin sesión;
--     - incrementar montos de distribución de pagos de cualquier nómina.
--
--   Además, la tabla `measure_units` tenía una política ALL con USING/CHECK = true:
--   cualquier usuario con sesión podía renombrar o BORRAR unidades compartidas
--   que otros usan.
--
-- SOLUCIÓN:
--   1) Reescribir ambas RPC (mismo cuerpo desplegado) añadiendo verificación de
--      permisos por dentro, y revocar EXECUTE de anon/public (solo authenticated).
--   2) measure_units: leer y AÑADIR unidades sigue disponible para cualquier
--      usuario con sesión (la app crea unidades al vuelo), pero EDITAR o BORRAR
--      una unidad compartida queda restringido a director o gestor de catálogo.
--
-- Idempotente: CREATE OR REPLACE / DROP POLICY IF EXISTS / CREATE POLICY.
-- Reversible: se puede volver a otorgar/abrir si hiciera falta.
-- =====================================================

-- -------------------------------------------------------
-- 1) rpc_inventory_add_movement — verificación de permiso de almacén
-- -------------------------------------------------------
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
  v_insert_cost    numeric;
  v_movement_id    uuid;
BEGIN
  -- Autorización: la función corre con privilegios elevados, así que aquí se
  -- reponen los controles de RLS que de otro modo se saltarían.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED: Debe iniciar sesión.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.user_has_any_capability(p_project_id, 'inventory_write', 'override_stock') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: No tiene permiso de almacén en este proyecto.'
      USING ERRCODE = '42501';
  END IF;

  -- Forzar stock negativo (override) exige el permiso específico.
  IF p_override_motivo IS NOT NULL
     AND NOT public.user_has_capability(p_project_id, 'override_stock') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED_OVERRIDE: No tiene permiso para forzar stock negativo.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (p_quantity > 0) THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: La cantidad del movimiento debe ser mayor que cero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_type = 'out' AND p_budget_item_id IS NULL AND p_budget_category_id IS NULL THEN
    RAISE EXCEPTION 'OUT_REQUIRES_PARTIDA: Toda salida de almacén debe imputarse a una partida del presupuesto.'
      USING ERRCODE = 'P0001';
  END IF;

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

  IF v_new_stock < 0 AND p_override_motivo IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Stock insuficiente: disponible %, solicitado %.',
      v_current_stock, p_quantity
      USING ERRCODE = 'P0001';
  END IF;

  -- Costo a registrar: salidas de consumo sin costo explícito toman el costo
  -- promedio vigente; reversas de recepción (con purchase_order_id) no llevan costo.
  v_insert_cost := p_unit_cost;
  IF p_type = 'out' AND v_insert_cost IS NULL AND p_purchase_order_id IS NULL THEN
    v_insert_cost := NULLIF(v_current_cost, 0);
  END IF;

  INSERT INTO public.inventory_movements (
    item_id, project_id, type, quantity, date,
    notes, supplier_id, budget_item_id, budget_category_id,
    purchase_order_id, unit_cost, created_by, lot_id,
    attachment_path, override_motivo, created_at
  ) VALUES (
    p_item_id, p_project_id, p_type, p_quantity, p_date,
    p_notes, p_supplier_id, p_budget_item_id, p_budget_category_id,
    p_purchase_order_id, v_insert_cost, p_created_by, p_lot_id,
    p_attachment_path, p_override_motivo, now()
  )
  RETURNING id INTO v_movement_id;

  v_next_cost := v_current_cost;
  IF p_type = 'in' AND p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
    IF (v_current_stock + p_quantity) > 0 THEN
      v_next_cost := (v_current_stock * v_current_cost + p_quantity * p_unit_cost)
                    / (v_current_stock + p_quantity);
    ELSE
      v_next_cost := p_unit_cost;
    END IF;
  END IF;

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      unit_cost     = v_next_cost
  WHERE id = p_item_id;

  RETURN v_movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_inventory_add_movement(
  uuid, uuid, text, numeric, date,
  text, uuid, uuid, uuid, uuid,
  numeric, text, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_inventory_add_movement(
  uuid, uuid, text, numeric, date,
  text, uuid, uuid, uuid, uuid,
  numeric, text, uuid, text, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_add_movement(
  uuid, uuid, text, numeric, date,
  text, uuid, uuid, uuid, uuid,
  numeric, text, uuid, text, text
) TO authenticated;

-- -------------------------------------------------------
-- 2) rpc_increment_payment_amount — verificación de permiso de pagos
-- -------------------------------------------------------
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED: Debe iniciar sesión.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (p_delta > 0) THEN
    RAISE EXCEPTION 'DELTA_NOT_POSITIVE: El monto a sumar debe ser mayor que cero.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_row FROM public.payment_distributions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND: No se encontró el pago a consolidar.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Autorización: solo quien puede distribuir pagos en el proyecto de esa nómina.
  IF NOT public.user_has_capability(public._project_of_payroll(v_row.payroll_period_id), 'distribute_payments') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: No tiene permiso para distribuir pagos en este proyecto.'
      USING ERRCODE = '42501';
  END IF;

  IF p_period_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_other_sum FROM public.payment_distributions
      WHERE payroll_period_id = v_row.payroll_period_id AND status <> 'cancelled' AND id <> p_id;
    IF v_other_sum + v_row.amount + p_delta > p_period_cap + 0.0001 THEN
      RAISE EXCEPTION 'EXCEEDS_PERIOD_CAP: El monto excede el total pendiente por distribuir.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_new_amount := ROUND((v_row.amount + p_delta)::numeric, 2);
  UPDATE public.payment_distributions SET amount = v_new_amount WHERE id = p_id
    RETURNING row_to_json(payment_distributions.*) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_increment_payment_amount(uuid, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_increment_payment_amount(uuid, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_increment_payment_amount(uuid, numeric, numeric) TO authenticated;

-- -------------------------------------------------------
-- 3) measure_units — proteger el catálogo compartido
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users full access" ON public.measure_units;

-- Leer: cualquier usuario con sesión.
CREATE POLICY measure_units_select ON public.measure_units
  FOR SELECT TO authenticated
  USING (true);

-- Añadir una unidad nueva: permitido (la app crea unidades al vuelo).
CREATE POLICY measure_units_insert ON public.measure_units
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Editar una unidad existente: solo director o gestor de catálogo.
CREATE POLICY measure_units_update ON public.measure_units
  FOR UPDATE TO authenticated
  USING (public.current_user_is_director() OR public.user_has_capability_anywhere('write_materials_catalog'))
  WITH CHECK (public.current_user_is_director() OR public.user_has_capability_anywhere('write_materials_catalog'));

-- Borrar una unidad: solo director o gestor de catálogo.
CREATE POLICY measure_units_delete ON public.measure_units
  FOR DELETE TO authenticated
  USING (public.current_user_is_director() OR public.user_has_capability_anywhere('write_materials_catalog'));
