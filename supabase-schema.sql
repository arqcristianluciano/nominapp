-- ============================================================
-- NominaAPP — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLAS BASE
-- ============================================================

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rnc text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  code text not null,
  location text,
  status text not null default 'active' check (status in ('active','completed','paused')),
  dt_percent numeric(5,2) not null default 0,
  admin_percent numeric(5,2) not null default 0,
  transport_percent numeric(5,2) not null default 0,
  planning_fee numeric(15,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  cedula text,
  phone text,
  bank_account text,
  bank_name text,
  payment_method text not null default 'cash' check (payment_method in ('cash','check','transfer')),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rnc text,
  contact_phone text,
  bank_account text,
  bank_name text,
  payment_terms text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  bank_name text not null,
  account_number text not null,
  account_type text,
  cedula_rnc text,
  is_internal boolean not null default true,
  project_id uuid references projects(id) on delete set null
);

-- ============================================================
-- PRESUPUESTO
-- ============================================================

create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  budgeted_amount numeric(15,2) not null default 0
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_category_id uuid not null references budget_categories(id) on delete cascade,
  code text,
  description text not null,
  unit text not null,
  quantity numeric(15,4) not null default 0,
  unit_price numeric(15,2) not null default 0,
  sort_order integer not null default 0,
  notes text
);

create table if not exists price_list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null check (category in ('material','labor','equipment')),
  code text,
  description text not null,
  unit text not null,
  unit_price numeric(15,2) not null default 0
);

-- ============================================================
-- NÓMINAS
-- ============================================================

create table if not exists payroll_periods (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  period_number integer not null,
  report_date date not null,
  reported_by text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','paid')),
  total_labor numeric(15,2) not null default 0,
  total_materials numeric(15,2) not null default 0,
  total_indirect numeric(15,2) not null default 0,
  grand_total numeric(15,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by text
);

create table if not exists labor_line_items (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  description text not null,
  quantity numeric(15,4) not null default 0,
  unit text not null,
  unit_price numeric(15,2) not null default 0,
  subtotal numeric(15,2) not null default 0,
  is_advance boolean not null default false,
  is_advance_deduction boolean not null default false,
  sort_order integer not null default 0,
  notes text
);

create table if not exists material_invoices (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  description text not null,
  invoice_reference text,
  amount numeric(15,2) not null default 0,
  budget_category_id uuid references budget_categories(id) on delete set null,
  attachment_path text,
  notes text
);

create table if not exists indirect_costs (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  type text not null,
  description text,
  percentage numeric(5,2),
  base_amount numeric(15,2),
  calculated_amount numeric(15,2) not null default 0,
  fixed_amount numeric(15,2),
  notes text
);

create table if not exists payment_distributions (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id),
  amount numeric(15,2) not null default 0,
  payment_method text not null check (payment_method in ('deposit','transfer','check','cash')),
  beneficiary text,
  check_number text,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  instructions text,
  completed_at timestamptz
);

-- ============================================================
-- CONTROL FINANCIERO
-- ============================================================

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  budget_category_id uuid references budget_categories(id) on delete set null,
  description text not null,
  supplier_id uuid references suppliers(id) on delete set null,
  quantity numeric(15,4),
  unit_price numeric(15,2),
  total numeric(15,2) not null default 0,
  payment_condition text,
  invoice_number text,
  check_number text,
  bank text,
  cashed_date date,
  payroll_period_id uuid references payroll_periods(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- CALIDAD Y CUBICACIONES
-- ============================================================

create table if not exists quality_control (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  element text not null,
  pour_date date not null,
  test_date date,
  test_age text,
  actual_resistance numeric(10,2),
  expected_resistance numeric(10,2),
  concrete_supplier text,
  laboratory text,
  status text check (status in ('passed','failed')),
  notes text
);

create table if not exists contract_cubications (
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

-- ============================================================
-- ÓRDENES DE COMPRA
-- ============================================================

create table if not exists purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  req_number text not null,
  description text not null,
  requested_by text not null,
  required_date date,
  status text not null default 'draft' check (
    status in ('draft','quoting','pending_approval','needs_revision','approved','ordered','rejected')
  ),
  notes text,
  approved_quote_id uuid,
  approved_by text,
  approved_at timestamptz,
  signature_data text,
  rejection_reason text,
  revision_notes text,
  payment_type text check (payment_type in ('credit','cash')),
  ordered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists purchase_quotes (
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
  notes text
);

create table if not exists purchase_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references purchase_quotes(id) on delete cascade,
  description text not null,
  quantity numeric(15,4) not null default 0,
  unit text not null,
  unit_price numeric(15,2) not null default 0,
  subtotal numeric(15,2) not null default 0
);

-- ============================================================
-- MÓDULO DE CUBICACIÓN v2
-- ============================================================

create table if not exists adjustment_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id),
  signed_date date,
  retention_percent numeric(5,2) not null default 5,
  notes text,
  created_at timestamptz default now()
);

create table if not exists contract_partidas (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  description text not null,
  unit text not null,
  unit_price numeric(15,2) not null default 0,
  agreed_quantity numeric(15,4) not null default 0,
  sort_order integer not null default 0
);

create table if not exists contract_cortes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  partida_id uuid not null references contract_partidas(id) on delete cascade,
  cut_number integer not null default 1,
  cut_date date not null,
  measured_quantity numeric(15,4) not null default 0,
  amount numeric(15,2) not null default 0,
  retention_amount numeric(15,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','approved','paid')),
  notes text,
  photo_url text,
  approved_by text,
  signature_data text,
  linked_payroll_id uuid references payroll_periods(id),
  created_at timestamptz default now()
);

create table if not exists contract_adelantos (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references adjustment_contracts(id) on delete cascade,
  advance_date date not null,
  amount numeric(15,2) not null default 0,
  description text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (desactivado por defecto — activar al tener Auth)
-- ============================================================

-- alter table companies enable row level security;
-- alter table projects enable row level security;
-- ... (activar cuando implementes Supabase Auth)

-- ============================================================
-- FUNCIÓN updated_at automático
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at before update on companies
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

create trigger trg_contractors_updated_at before update on contractors
  for each row execute function set_updated_at();

create trigger trg_suppliers_updated_at before update on suppliers
  for each row execute function set_updated_at();

create trigger trg_requisitions_updated_at before update on purchase_requisitions
  for each row execute function set_updated_at();
