-- =====================================================
-- NominApp - Migración 019: Tablas de obra faltantes en producción
-- supabase-schema.sql declara estas tablas pero nunca llegaron al
-- proyecto remoto. Necesarias para inventory_imputation (008) y para
-- los módulos de obra (bitácora, asistencia, cronograma, etc.).
-- Idempotente (IF NOT EXISTS).
-- =====================================================

CREATE TABLE IF NOT EXISTS bitacora_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  weather text not null,
  temp_c numeric(5,2),
  work_summary text not null,
  workforce_count integer not null default 0,
  equipment text,
  visitors text,
  incidents text,
  notes text,
  created_by text not null,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  contractor_id uuid not null references contractors(id),
  workers_count integer not null default 0,
  hours_worked numeric(6,2) not null default 0,
  activity text not null,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  unit text not null,
  current_stock numeric(15,4) not null default 0,
  min_stock numeric(15,4) not null default 0,
  unit_cost numeric(15,2) not null default 0,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('in','out')),
  quantity numeric(15,4) not null default 0,
  date date not null,
  supplier_id uuid references suppliers(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  color text not null default '#3b82f6',
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS contractor_documents (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  doc_type text not null,
  name text not null,
  file_ref text,
  expiry_date date,
  status text not null default 'valid' check (status in ('valid','expiring','expired','missing')),
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS mercado_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  file_name text not null,
  imported_at timestamptz not null default now(),
  total_ajustes numeric(15,2) not null default 0,
  total_equipos numeric(15,2) not null default 0,
  total_mano_obra numeric(15,2) not null default 0,
  total_materiales numeric(15,2) not null default 0
);

CREATE TABLE IF NOT EXISTS mercado_budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references mercado_budgets(id) on delete cascade,
  category text not null check (category in ('AJUSTES','EQUIPOS','MANO_DE_OBRA','MATERIALES')),
  code text,
  description text not null,
  unit text not null,
  budgeted_quantity numeric(15,4) not null default 0,
  budgeted_unit_price numeric(15,2) not null default 0,
  budgeted_total numeric(15,2) not null default 0,
  sort_order integer not null default 0,
  contract_id uuid references adjustment_contracts(id) on delete set null,
  agreed_quantity numeric(15,4),
  agreed_unit_price numeric(15,2)
);

CREATE INDEX IF NOT EXISTS idx_bitacora_project_date ON bitacora_entries(project_id, date desc);
CREATE INDEX IF NOT EXISTS idx_attendance_project_date ON attendance_records(project_id, date desc);
CREATE INDEX IF NOT EXISTS idx_inventory_items_project ON inventory_items(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_project_date ON inventory_movements(project_id, date desc);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project_dates ON schedule_tasks(project_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contractor_documents_contractor ON contractor_documents(contractor_id);
CREATE INDEX IF NOT EXISTS idx_mercado_budgets_project ON mercado_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_mercado_lines_budget ON mercado_budget_lines(budget_id);
