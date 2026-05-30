-- =====================================================
-- NominApp - Migración 014: Versionado de presupuesto
-- Estado deseado, regla 7.7: cambios al presupuesto post-aprobación
-- quedan en histórico con motivo y autor.
--
-- Modelo: snapshot por proyecto + motivo + autor. La aplicación llama
-- budgetVersionService.snapshot(...) antes de cada cambio post-aprobación.
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  motivo        TEXT NOT NULL,
  actor         TEXT,
  snapshot      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_budget_versions_project
  ON budget_versions(project_id, version DESC);

COMMENT ON TABLE budget_versions IS
  'Histórico de versiones del presupuesto por proyecto (regla 7.7). El snapshot incluye categories e items en el momento del cambio.';
COMMENT ON COLUMN budget_versions.snapshot IS
  'JSONB con shape: { categories: BudgetCategory[], items: BudgetItem[] }';
