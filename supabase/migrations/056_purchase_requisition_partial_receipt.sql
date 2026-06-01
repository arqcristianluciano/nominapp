-- =====================================================
-- NominApp - Migración 051: recepción parcial de mercancía
-- -----------------------------------------------------
-- El suplidor puede entregar una OC en varias tandas. Para soportarlo:
--   1. Nuevo estado 'partially_received' (recibida parcial): hay entradas a
--      almacén pero todavía falta material por recibir. La OC sigue
--      comprometiendo presupuesto igual que 'ordered'/'received'.
--   2. Se registra la cantidad ya recibida por línea de la cotización aprobada
--      (purchase_quote_items.received_quantity) para conocer el pendiente.
--
-- Flujo: ordered → (recepción parcial) → partially_received → … → received.
-- La reversa de recepción devuelve la OC a 'ordered' y pone received_quantity
-- de nuevo en 0.
-- =====================================================

ALTER TABLE purchase_requisitions
  DROP CONSTRAINT IF EXISTS purchase_requisitions_status_check;

ALTER TABLE purchase_requisitions
  ADD CONSTRAINT purchase_requisitions_status_check CHECK (
    status IN (
      'draft',
      'pendiente_validacion',
      'quoting',
      'pending_approval',
      'needs_revision',
      'pendiente_liberacion',
      'approved',
      'ordered',
      'partially_received',
      'received',
      'rejected'
    )
  );

-- Cantidad ya recibida en almacén por línea (0 = nada recibido todavía).
ALTER TABLE purchase_quote_items
  ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(15,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN purchase_quote_items.received_quantity IS
  'Cantidad de esta línea ya ingresada a almacén (recepción parcial). El pendiente = quantity - received_quantity.';
