-- =====================================================
-- NominApp - Migración 035: Tablas legadas idempotentes
-- Estas tablas existen en el proyecto remoto (prod) pero nunca fueron
-- declaradas en migraciones del repo (vienen de un schema legado).
-- Esta migración usa CREATE TABLE IF NOT EXISTS para reproducir el
-- schema real en un fresh init, sin afectar prod.
--
-- Tablas cubiertas:
--   - adjustment_contracts
--   - contract_partidas
--   - contract_cortes
--   - contract_adelantos
--   - contract_cubications
--   - contractor_loans
--   - loan_deductions
--   - purchase_requisitions
--   - purchase_quotes
--   - purchase_quote_items
--   - purchase_orders
--   - purchase_order_items
--
-- Las columnas, tipos, defaults, FKs e índices reflejan exactamente
-- lo presente en producción (proyecto pkllcsexipdvwdpunlkz).
-- =====================================================

-- =====================================================
-- adjustment_contracts
-- =====================================================
CREATE TABLE IF NOT EXISTS adjustment_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  signed_date date,
  retention_percent numeric(5,2) not null default 5,
  notes text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_adj_contracts_project ON adjustment_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_adj_contracts_contractor ON adjustment_contracts(contractor_id);

-- =====================================================
-- contract_partidas
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_partidas (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  description text not null,
  unit text not null,
  unit_price numeric(15,2) not null default 0,
  agreed_quantity numeric(15,4) not null default 0,
  sort_order bigint not null default 0
);

CREATE INDEX IF NOT EXISTS idx_contract_partidas_contract ON contract_partidas(contract_id);

-- =====================================================
-- contract_cortes
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_cortes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  partida_id uuid not null references contract_partidas(id) on delete cascade,
  cut_number integer not null default 1,
  cut_date date not null,
  measured_quantity numeric(15,4) not null default 0,
  amount numeric(15,2) not null default 0,
  retention_amount numeric(15,2) not null default 0,
  status text not null default 'draft' CHECK (status IN ('draft','approved','paid')),
  notes text,
  photo_url text,
  approved_by text,
  signature_data text,
  linked_payroll_id uuid references payroll_periods(id),
  created_at timestamptz default now(),
  CONSTRAINT contract_cortes_unique_cut_number UNIQUE (contract_id, cut_number)
);

CREATE INDEX IF NOT EXISTS idx_contract_cortes_contract ON contract_cortes(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_cortes_partida ON contract_cortes(partida_id);
CREATE INDEX IF NOT EXISTS idx_contract_cortes_status ON contract_cortes(status);

-- =====================================================
-- contract_adelantos
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_adelantos (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  advance_date date not null,
  amount numeric(15,2) not null default 0,
  description text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_contract_adelantos_contract ON contract_adelantos(contract_id);

-- =====================================================
-- contract_cubications
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_cubications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  specialty text not null,
  original_budget numeric(15,2),
  adjusted_budget numeric(15,2),
  total_advanced numeric(15,2) not null default 0,
  remaining numeric(15,2) not null default 0,
  completion_percent numeric(5,2) not null default 0
);

-- =====================================================
-- contractor_loans
-- =====================================================
CREATE TABLE IF NOT EXISTS contractor_loans (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  principal numeric(15,2) not null default 0,
  interest_rate numeric(5,2) not null default 0,
  installments integer not null default 1,
  installment_amount numeric(15,2) not null default 0,
  disbursed_date date not null,
  status text not null default 'active' CHECK (status IN ('active','paid','cancelled')),
  notes text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_loans_contractor ON contractor_loans(contractor_id);

-- =====================================================
-- loan_deductions
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_deductions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references contractor_loans(id) on delete cascade,
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  amount numeric(15,2) not null default 0,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_loan_deductions_loan ON loan_deductions(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_deductions_period ON loan_deductions(payroll_period_id);

-- =====================================================
-- purchase_requisitions
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  req_number text not null,
  description text not null,
  requested_by text not null,
  required_date date,
  status text not null default 'draft' CHECK (status IN (
    'draft','pendiente_validacion','quoting','pending_approval',
    'needs_revision','approved','ordered','received','rejected'
  )),
  notes text,
  approved_quote_id uuid,
  approved_by text,
  approved_at timestamptz,
  signature_data text,
  rejection_reason text,
  revision_notes text,
  payment_type text CHECK (payment_type IS NULL OR payment_type IN ('credit','cash')),
  ordered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  budget_item_id uuid references budget_items(id) on delete set null,
  budget_category_id uuid references budget_categories(id) on delete set null,
  quantity_requested numeric(15,4),
  unit text,
  resource_type text CHECK (resource_type IS NULL OR resource_type IN ('material','labor','equipment','other')),
  excess_motivo text,
  validated_by text,
  validated_at timestamptz,
  planned_quantity_at_request numeric(15,4),
  available_quantity_at_request numeric(15,4),
  single_quote_justification text,
  released_by text,
  released_at timestamptz,
  received_at timestamptz,
  received_by text
);

CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_budget_item ON purchase_requisitions(budget_item_id);

-- =====================================================
-- purchase_quotes
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_quotes (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references purchase_requisitions(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  quote_number text,
  valid_until date,
  subtotal numeric(15,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  total numeric(15,2) not null default 0,
  negotiated_total numeric(15,2),
  negotiated_notes text,
  notes text,
  attachment_path text
);

-- =====================================================
-- purchase_quote_items
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references purchase_quotes(id) on delete cascade,
  description text not null,
  quantity numeric(15,4) not null default 0,
  unit text not null,
  unit_price numeric(15,2) not null default 0,
  subtotal numeric(15,2) not null default 0
);

-- =====================================================
-- purchase_orders
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  order_number text not null UNIQUE,
  status text not null default 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected')),
  requested_by text not null,
  requested_date date not null default CURRENT_DATE,
  required_date date,
  notes text,
  subtotal numeric(14,2) not null default 0,
  tax_percent numeric(5,2) not null default 18,
  total numeric(14,2) not null default 0,
  approval_code text,
  approved_by text,
  approved_at timestamptz,
  signature_data text,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- =====================================================
-- purchase_order_items
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(12,4) not null,
  unit text not null,
  unit_price numeric(14,2) not null,
  subtotal numeric(14,2) not null
);

CREATE INDEX IF NOT EXISTS idx_poi_order ON purchase_order_items(purchase_order_id);
