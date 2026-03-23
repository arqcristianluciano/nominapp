-- =====================================================
-- ObraPRO - Schema Completo
-- Sistema de Administración de Construcción
-- =====================================================

-- 1. Empresas (compartida con estatePRO)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rnc TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Proyectos (compartida con estatePRO, campos extendidos para construcción)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  dt_percent NUMERIC(5,2) DEFAULT 10,
  admin_percent NUMERIC(5,2) DEFAULT 1,
  transport_percent NUMERIC(5,2) DEFAULT 0.5,
  planning_fee NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Contratistas / maestros de obra
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  cedula TEXT,
  phone TEXT,
  bank_account TEXT,
  bank_name TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'transfer')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rnc TEXT,
  contact_phone TEXT,
  bank_account TEXT,
  bank_name TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Cuentas bancarias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT,
  cedula_rnc TEXT,
  is_internal BOOLEAN DEFAULT true,
  project_id UUID REFERENCES projects(id)
);

-- 6. Categorías presupuestarias
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER,
  budgeted_amount NUMERIC(14,2) DEFAULT 0,
  UNIQUE(project_id, code)
);

-- 7. Períodos de nómina (cada hoja del Excel)
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  period_number INTEGER NOT NULL,
  report_date DATE NOT NULL,
  reported_by TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  total_labor NUMERIC(14,2) DEFAULT 0,
  total_materials NUMERIC(14,2) DEFAULT 0,
  total_indirect NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  UNIQUE(project_id, period_number)
);

-- 8. Partidas de mano de obra
CREATE TABLE IF NOT EXISTS labor_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_advance BOOLEAN DEFAULT false,
  is_advance_deduction BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  notes TEXT
);

-- 9. Facturas de materiales
CREATE TABLE IF NOT EXISTS material_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  description TEXT NOT NULL,
  invoice_reference TEXT,
  amount NUMERIC(14,2) NOT NULL,
  budget_category_id UUID REFERENCES budget_categories(id),
  attachment_path TEXT,
  notes TEXT
);

-- 10. Gastos indirectos
CREATE TABLE IF NOT EXISTS indirect_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  percentage NUMERIC(5,2),
  base_amount NUMERIC(14,2),
  calculated_amount NUMERIC(14,2) NOT NULL,
  fixed_amount NUMERIC(14,2),
  notes TEXT
);

-- 11. Distribución de pagos
CREATE TABLE IF NOT EXISTS payment_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id),
  amount NUMERIC(14,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('deposit', 'transfer', 'check', 'cash')),
  beneficiary TEXT,
  check_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  instructions TEXT,
  completed_at TIMESTAMPTZ
);

-- 12. Transacciones generales (modelo Capullo)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  date DATE NOT NULL,
  budget_category_id UUID REFERENCES budget_categories(id),
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  quantity NUMERIC(12,4),
  unit_price NUMERIC(12,2),
  total NUMERIC(14,2) NOT NULL,
  payment_condition TEXT,
  invoice_number TEXT,
  check_number TEXT,
  bank TEXT,
  cashed_date DATE,
  payroll_period_id UUID REFERENCES payroll_periods(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Control de calidad
CREATE TABLE IF NOT EXISTS quality_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  element TEXT NOT NULL,
  pour_date DATE NOT NULL,
  test_date DATE,
  test_age TEXT,
  actual_resistance NUMERIC(8,2),
  expected_resistance NUMERIC(8,2),
  concrete_supplier TEXT,
  laboratory TEXT,
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN actual_resistance IS NULL THEN 'pending'
         WHEN actual_resistance >= expected_resistance THEN 'passed'
         ELSE 'failed' END
  ) STORED,
  notes TEXT
);

-- 14. Cubicaciones de contratos
CREATE TABLE IF NOT EXISTS contract_cubications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  contractor_id UUID REFERENCES contractors(id),
  specialty TEXT NOT NULL,
  original_budget NUMERIC(14,2),
  adjusted_budget NUMERIC(14,2),
  total_advanced NUMERIC(14,2) DEFAULT 0,
  remaining NUMERIC(14,2) GENERATED ALWAYS AS (
    COALESCE(adjusted_budget, 0) - COALESCE(total_advanced, 0)
  ) STORED,
  completion_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN COALESCE(adjusted_budget, 0) > 0 
         THEN (COALESCE(total_advanced, 0) / adjusted_budget) * 100 
         ELSE 0 END
  ) STORED
);

-- =====================================================
-- INDICES
-- =====================================================
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_payroll_project ON payroll_periods(project_id);
CREATE INDEX idx_payroll_status ON payroll_periods(status);
CREATE INDEX idx_labor_payroll ON labor_line_items(payroll_period_id);
CREATE INDEX idx_labor_contractor ON labor_line_items(contractor_id);
CREATE INDEX idx_materials_payroll ON material_invoices(payroll_period_id);
CREATE INDEX idx_materials_supplier ON material_invoices(supplier_id);
CREATE INDEX idx_transactions_project ON transactions(project_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_quality_project ON quality_control(project_id);
CREATE INDEX idx_cubications_project ON contract_cubications(project_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE indirect_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_cubications ENABLE ROW LEVEL SECURITY;

-- Política permisiva para usuarios autenticados (ajustar por rol después)
CREATE POLICY "Authenticated users full access" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON contractors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON budget_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON payroll_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON labor_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON material_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON indirect_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON payment_distributions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON quality_control FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON contract_cubications FOR ALL TO authenticated USING (true) WITH CHECK (true);
