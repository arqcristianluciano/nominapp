-- =====================================================
-- NominApp - Migración 050: estado 'pendiente_liberacion' (doble aprobación)
-- -----------------------------------------------------
-- Regla 7.2 — la emisión de una OC requiere DOS autorizaciones:
--   1. Aprobación del Director de Proyecto (selecciona cotización + firma):
--        pending_approval → pendiente_liberacion
--   2. Liberación final del Administrador (Director General), que define la
--      condición de pago y emite la orden:
--        pendiente_liberacion → ordered
--
-- Antes, approve() pasaba directo a 'approved' y cualquiera con
-- release_purchase_order podía colocar la orden, saltándose al Administrador.
-- Esta migración amplía el CHECK de status para admitir el estado intermedio.
-- 'approved' se conserva por compatibilidad con OC históricas.
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
      'received',
      'rejected'
    )
  );

COMMENT ON COLUMN purchase_requisitions.released_by IS
  'Administrador (Director General) que liberó y emitió la OC tras la aprobación del Director (regla 7.2).';
COMMENT ON COLUMN purchase_requisitions.released_at IS
  'Timestamp de la liberación final del Administrador (paso previo a quedar en estado ordered).';
