-- =====================================================
-- NominApp - Migración 008: Almacén imputado a partida + entradas vinculadas a OC
-- Estado deseado, reglas 7.4 y 7.5 y módulo 6.4:
--   - Toda salida de almacén debe imputarse a una partida.
--   - Toda entrada idealmente referencia una OC liberada.
--   - Stock negativo se bloquea por el servicio; el override del Gerente
--     queda registrado en la tabla approvals (migración 005).
-- El catálogo global de materiales con código único transversal queda
-- para Nivel 2 (no se introduce aquí para mantener el cambio quirúrgico).
-- =====================================================

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS budget_item_id     UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_order_id  UUID REFERENCES purchase_requisitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS created_by         TEXT,
  ADD COLUMN IF NOT EXISTS override_motivo    TEXT;

-- Salidas requieren imputación a partida (item o categoría).
-- El CHECK acepta SET NULL en cascada si la partida se borra; en ese caso
-- el movimiento queda histórico y el servicio reporta inconsistencia.
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_out_requires_imputation;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_out_requires_imputation CHECK (
    type <> 'out'
    OR budget_item_id IS NOT NULL
    OR budget_category_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_inventory_movements_budget_item
  ON inventory_movements(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_purchase_order
  ON inventory_movements(purchase_order_id);

COMMENT ON COLUMN inventory_movements.budget_item_id IS
  'Partida imputada. Obligatoria en salidas (regla 7.4). Nullable en entradas.';
COMMENT ON COLUMN inventory_movements.purchase_order_id IS
  'OC (purchase_requisition) que originó la entrada. Recomendada para entradas, nullable.';
COMMENT ON COLUMN inventory_movements.override_motivo IS
  'Motivo cuando el Gerente fuerza una salida que dejaría stock negativo (regla 7.5).';
COMMENT ON COLUMN inventory_movements.unit_cost IS
  'Costo unitario del movimiento (entrada: precio efectivo; salida: costo a imputar).';
