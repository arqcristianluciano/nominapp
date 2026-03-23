-- =====================================================
-- ObraPRO - Migración 002: Órdenes de Compra
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id),
  order_number    TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','pending_approval','approved','rejected')),
  requested_by    TEXT NOT NULL,
  requested_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date   DATE,
  notes           TEXT,
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_percent     NUMERIC(5,2)  NOT NULL DEFAULT 18,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  approval_code   TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  signature_data  TEXT,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  quantity            NUMERIC(12,4) NOT NULL,
  unit                TEXT NOT NULL,
  unit_price          NUMERIC(14,2) NOT NULL,
  subtotal            NUMERIC(14,2) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project  ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_poi_order                ON purchase_order_items(purchase_order_id);

-- RLS
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_all_purchase_orders"
  ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "allow_all_purchase_order_items"
  ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
