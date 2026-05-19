-- =====================================================
-- NominApp - Migración 005: Tabla central de aprobaciones
-- Estado deseado, regla 7.8: auditoría append-only para
-- toda acción que mueve dinero, stock o status crítico.
-- =====================================================

CREATE TABLE IF NOT EXISTS approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  action              TEXT NOT NULL,
  actor_user_id       TEXT,
  actor_display_name  TEXT,
  payload_before      JSONB,
  payload_after       JSONB,
  motivo              TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_entity
  ON approvals(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_actor
  ON approvals(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_action
  ON approvals(action, created_at DESC);

-- RLS append-only (insert+select). No hay policy de update ni delete:
-- la auditoría es inmutable. Cuando se endurezca RLS por rol/proyecto al
-- cierre del Nivel 1, las dos policies abajo se reemplazan por versiones
-- que validan project_id en metadata.
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_approvals" ON approvals;
CREATE POLICY "authenticated_read_approvals" ON approvals
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_approvals" ON approvals;
CREATE POLICY "authenticated_insert_approvals" ON approvals
  FOR INSERT TO authenticated WITH CHECK (true);
