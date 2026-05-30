-- =====================================================
-- NominApp - Migración 009: Mano de obra imputada a partida
-- Estado deseado, regla 7.6 y módulo 6.5: cada línea de mano de obra
-- debe imputarse a la partida (capítulo) donde se ejecuta el trabajo.
-- Esto habilita la cubicación mensual y plan-vs-real por capítulo/partida.
-- material_invoices ya tiene budget_category_id; añadimos también
-- budget_item_id por simetría con futura granularidad.
-- =====================================================

ALTER TABLE labor_line_items
  ADD COLUMN IF NOT EXISTS budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_item_id     UUID REFERENCES budget_items(id) ON DELETE SET NULL;

ALTER TABLE material_invoices
  ADD COLUMN IF NOT EXISTS budget_item_id     UUID REFERENCES budget_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_labor_budget_category
  ON labor_line_items(budget_category_id);
CREATE INDEX IF NOT EXISTS idx_labor_budget_item
  ON labor_line_items(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_material_invoices_budget_item
  ON material_invoices(budget_item_id);

COMMENT ON COLUMN labor_line_items.budget_category_id IS
  'Capítulo (categoría presupuestaria) al que se imputa esta línea de mano de obra. Regla 7.6.';
COMMENT ON COLUMN labor_line_items.budget_item_id IS
  'Partida específica (subpartida) imputada. Opcional, mayor granularidad.';
