-- =====================================================
-- NominApp - Migración 018: Backfill de aprobaciones históricas
-- Copia approved_by/approved_at + acciones de signature de las tablas
-- existentes hacia approvals, para tener auditoría completa desde el día
-- uno. Idempotente: usa ON CONFLICT DO NOTHING vía metadata.event_key.
-- =====================================================

-- payroll_periods aprobadas
INSERT INTO approvals (
  entity_type, entity_id, action, actor_display_name,
  payload_after, metadata, created_at
)
SELECT
  'payroll_period',
  id,
  'approve',
  approved_by,
  jsonb_build_object('status', 'approved'),
  jsonb_build_object(
    'backfill', true,
    'period_number', period_number,
    'project_id', project_id,
    'event_key', concat('payroll_period:', id, ':approve')
  ),
  COALESCE(approved_at, created_at, now())
FROM payroll_periods
WHERE approved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approvals a
    WHERE a.entity_type = 'payroll_period'
      AND a.entity_id = payroll_periods.id
      AND a.action = 'approve'
      AND (a.metadata->>'backfill')::boolean IS TRUE
  );

-- purchase_requisitions aprobadas
INSERT INTO approvals (
  entity_type, entity_id, action, actor_display_name,
  payload_after, motivo, metadata, created_at
)
SELECT
  'purchase_requisition',
  id,
  'approve',
  approved_by,
  jsonb_build_object('status', 'approved', 'approved_quote_id', approved_quote_id),
  single_quote_justification,
  jsonb_build_object(
    'backfill', true,
    'req_number', req_number,
    'project_id', project_id,
    'event_key', concat('purchase_requisition:', id, ':approve')
  ),
  COALESCE(approved_at, created_at, now())
FROM purchase_requisitions
WHERE approved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approvals a
    WHERE a.entity_type = 'purchase_requisition'
      AND a.entity_id = purchase_requisitions.id
      AND a.action = 'approve'
      AND (a.metadata->>'backfill')::boolean IS TRUE
  );

-- purchase_requisitions liberadas
INSERT INTO approvals (
  entity_type, entity_id, action, actor_display_name,
  payload_after, metadata, created_at
)
SELECT
  'purchase_requisition',
  id,
  'release',
  released_by,
  jsonb_build_object('released', true),
  jsonb_build_object(
    'backfill', true,
    'req_number', req_number,
    'project_id', project_id,
    'event_key', concat('purchase_requisition:', id, ':release')
  ),
  COALESCE(released_at, now())
FROM purchase_requisitions
WHERE released_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approvals a
    WHERE a.entity_type = 'purchase_requisition'
      AND a.entity_id = purchase_requisitions.id
      AND a.action = 'release'
      AND (a.metadata->>'backfill')::boolean IS TRUE
  );

-- contract_cortes aprobados
INSERT INTO approvals (
  entity_type, entity_id, action, actor_display_name,
  payload_after, metadata, created_at
)
SELECT
  'contract_corte',
  id,
  'approve',
  approved_by,
  jsonb_build_object('status', status),
  jsonb_build_object(
    'backfill', true,
    'contract_id', contract_id,
    'event_key', concat('contract_corte:', id, ':approve')
  ),
  created_at
FROM contract_cortes
WHERE status IN ('approved', 'paid')
  AND approved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approvals a
    WHERE a.entity_type = 'contract_corte'
      AND a.entity_id = contract_cortes.id
      AND a.action = 'approve'
      AND (a.metadata->>'backfill')::boolean IS TRUE
  );

COMMENT ON COLUMN approvals.metadata IS
  'JSONB con contexto adicional. metadata.backfill=true indica que la fila viene de la migración 018 (auditoría retroactiva).';
