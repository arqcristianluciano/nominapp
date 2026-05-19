-- =====================================================
-- NominApp - Migración 006: Solicitudes imputadas a partida
-- Estado deseado, regla 7.1 y módulo 6.2: cada solicitud
-- debe apuntar a una partida del presupuesto, llevar cantidad
-- y unidad, y bloquearse en pendiente_validacion cuando excede
-- la cantidad planificada.
-- =====================================================

-- 1. Campos de imputación y cantidad solicitada
ALTER TABLE purchase_requisitions
  ADD COLUMN IF NOT EXISTS budget_item_id      UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_category_id  UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_requested  NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS unit                TEXT,
  ADD COLUMN IF NOT EXISTS resource_type       TEXT
    CHECK (resource_type IS NULL OR resource_type IN ('material','labor','equipment','other'));

-- 2. Campos de validación de excedente
ALTER TABLE purchase_requisitions
  ADD COLUMN IF NOT EXISTS excess_motivo       TEXT,
  ADD COLUMN IF NOT EXISTS validated_by        TEXT,
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_quantity_at_request   NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS available_quantity_at_request NUMERIC(15,4);

-- 3. Ampliar el dominio de status para incluir 'pendiente_validacion'
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
      'approved',
      'ordered',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_budget_item
  ON purchase_requisitions(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status
  ON purchase_requisitions(status);

-- 4. Vista materializable (calculada por servicio en runtime, no aquí):
--    available = budget_items.quantity
--                - SUM(quantity_requested) WHERE status IN
--                  ('quoting','pending_approval','approved','ordered')
--    Cuando el servicio detecta solicitado > available, transiciona a
--    pendiente_validacion en vez de quoting.

COMMENT ON COLUMN purchase_requisitions.planned_quantity_at_request IS
  'Snapshot de la cantidad planificada en la partida al momento de crear la solicitud (auditoría).';
COMMENT ON COLUMN purchase_requisitions.available_quantity_at_request IS
  'Snapshot de la cantidad disponible (planificada - comprometida) al crear la solicitud.';
COMMENT ON COLUMN purchase_requisitions.excess_motivo IS
  'Motivo escrito que Planificación o Gerente registran al liberar una solicitud que excede el plan.';
