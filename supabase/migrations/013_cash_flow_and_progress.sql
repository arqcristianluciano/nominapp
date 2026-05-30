-- =====================================================
-- NominApp - Migración 013: Plan de flujo de caja + avances por partida
-- Estado deseado, secciones 6.1 (flujo de caja) y 6.6 (cubicación mensual).
--
-- expected_cash_inflows: ingresos por cubierta planificados (editable;
-- preparado para integración futura con estatePRO).
-- partida_progress: avance físico por partida (% o cantidad ejecutada),
-- base para cubicación mensual y conciliación con costos reales.
-- =====================================================

CREATE TABLE IF NOT EXISTS expected_cash_inflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expected_date DATE NOT NULL,
  amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  concept       TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','estatepro','contract','other')),
  external_ref  TEXT,
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expected_cash_inflows_project_date
  ON expected_cash_inflows(project_id, expected_date);

CREATE TABLE IF NOT EXISTS partida_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_item_id    UUID REFERENCES budget_items(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  cut_date          DATE NOT NULL,
  executed_quantity NUMERIC(15,4),
  executed_percent  NUMERIC(5,2) CHECK (executed_percent IS NULL OR (executed_percent >= 0 AND executed_percent <= 100)),
  notes             TEXT,
  responsible       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (executed_quantity IS NOT NULL OR executed_percent IS NOT NULL),
  CHECK (budget_item_id IS NOT NULL OR budget_category_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_partida_progress_project_date
  ON partida_progress(project_id, cut_date DESC);
CREATE INDEX IF NOT EXISTS idx_partida_progress_item
  ON partida_progress(budget_item_id, cut_date DESC);
CREATE INDEX IF NOT EXISTS idx_partida_progress_category
  ON partida_progress(budget_category_id, cut_date DESC);

COMMENT ON TABLE expected_cash_inflows IS
  'Ingresos esperados por proyecto (cuotas de cubierta, ventas, etc.). Editable manualmente; preparado para integración estatePRO (source=estatepro).';
COMMENT ON TABLE partida_progress IS
  'Avance físico por partida (cantidad ejecutada o %), base para cubicación mensual.';
