-- =====================================================
-- NominApp - Migración 053: línea de cotización referencia el catálogo
-- -----------------------------------------------------
-- Al cotizar, cada línea puede vincularse a un material del catálogo global
-- (materials_catalog). Esto permite que, al recibir la mercancía, la entrada a
-- almacén se enlace al material correcto (no por nombre/heurística) y alimente
-- con precisión el histórico de precios. Opcional: las líneas sin catálogo
-- siguen funcionando por descripción.
-- =====================================================

ALTER TABLE purchase_quote_items
  ADD COLUMN IF NOT EXISTS material_catalog_id UUID REFERENCES materials_catalog(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_quote_items_catalog
  ON purchase_quote_items(material_catalog_id);

COMMENT ON COLUMN purchase_quote_items.material_catalog_id IS
  'Material del catálogo global asociado a la línea (opcional). Usado al recibir para enlazar la entrada de almacén al material correcto.';
