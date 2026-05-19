-- =====================================================
-- NominApp - Migración 012: Fechas de inicio y fin en capítulos y partidas
-- Estado deseado, sección 6.1: habilita cronograma derivado del presupuesto
-- y plan de flujo de caja proyectado.
-- =====================================================

ALTER TABLE budget_categories
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

CREATE INDEX IF NOT EXISTS idx_budget_categories_dates
  ON budget_categories(project_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_items_dates
  ON budget_items(budget_category_id, start_date, end_date);

COMMENT ON COLUMN budget_categories.start_date IS
  'Fecha de inicio del capítulo según cronograma de obra.';
COMMENT ON COLUMN budget_categories.end_date IS
  'Fecha de fin del capítulo según cronograma de obra.';
