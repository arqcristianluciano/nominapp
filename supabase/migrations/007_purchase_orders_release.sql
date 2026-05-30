-- =====================================================
-- NominApp - Migración 007: Liberación de OC + justificación 1 cotización
-- Estado deseado, reglas 7.2 y 7.3:
--   - OC con >=2 cotizaciones requiere liberación del Gerente
--     (status nuevo intermedio 'pendiente_liberacion').
--   - OC con 1 cotización requiere justificación obligatoria
--     + aprobación explícita del Gerente.
-- Se mantiene la tabla purchase_requisitions como entidad principal
-- (el flujo activo de la app la usa); se documenta el mapeo conceptual
-- al vocabulario del estado deseado:
--   borrador            = draft | quoting | needs_revision
--   pendiente_liberacion = pending_approval (>=2 cotizaciones)
--   liberada            = approved
--   recibida            = (nuevo status 'received' añadido aquí)
--   cancelada           = rejected
-- =====================================================

-- 1. Justificación de 1 cotización y liberación del Gerente
ALTER TABLE purchase_requisitions
  ADD COLUMN IF NOT EXISTS single_quote_justification TEXT,
  ADD COLUMN IF NOT EXISTS released_by                TEXT,
  ADD COLUMN IF NOT EXISTS released_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by                TEXT;

-- 2. Ampliar status para incluir 'received' (recibida)
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
      'received',
      'rejected'
    )
  );

-- 3. Adjuntos de cotización (PDF en Supabase Storage)
ALTER TABLE purchase_quotes
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

COMMENT ON COLUMN purchase_requisitions.single_quote_justification IS
  'Justificación obligatoria cuando la OC se aprueba con 1 sola cotización (regla 7.3).';
COMMENT ON COLUMN purchase_requisitions.released_by IS
  'Gerente que liberó la OC tras aprobación con 2+ cotizaciones (regla 7.2).';
COMMENT ON COLUMN purchase_requisitions.received_at IS
  'Timestamp en que los materiales llegaron a obra (alimenta entradas de almacén).';
COMMENT ON COLUMN purchase_quotes.attachment_path IS
  'Path del PDF de cotización en Supabase Storage (bucket attachments).';
