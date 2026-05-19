-- =====================================================
-- NominApp - Migración 011: Catálogo global de materiales
-- Estado deseado, sección 6.4 / punto 10:
-- código único transversal entre proyectos para histórico de compras
-- y precios. Los inventory_items por proyecto referencian este catálogo
-- de forma opcional (legacy items sin catálogo siguen funcionando).
-- =====================================================

CREATE TABLE IF NOT EXISTS materials_catalog (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  description        TEXT NOT NULL,
  unit               TEXT NOT NULL,
  default_min_stock  NUMERIC(15,4) NOT NULL DEFAULT 0,
  category           TEXT,
  notes              TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_catalog_active
  ON materials_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_catalog_category
  ON materials_catalog(category);

-- Vínculo opcional: inventory_items por proyecto pueden referenciar el catálogo.
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS material_catalog_id UUID REFERENCES materials_catalog(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_catalog
  ON inventory_items(material_catalog_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_materials_catalog_updated_at ON materials_catalog;
CREATE TRIGGER trg_materials_catalog_updated_at
  BEFORE UPDATE ON materials_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE materials_catalog IS
  'Catálogo global de materiales con código único transversal entre proyectos.';
COMMENT ON COLUMN materials_catalog.code IS
  'Código único del material en toda la operación. Habilita histórico de precios cross-proyecto.';
