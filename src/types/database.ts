export interface Company {
  id: string
  name: string
  rnc: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  company_id: string
  name: string
  code: string
  location: string | null
  status: 'active' | 'completed' | 'paused'
  dt_percent: number
  admin_percent: number
  transport_percent: number
  planning_fee: number
  created_at: string
  updated_at: string
  company?: Company
}

export interface Contractor {
  id: string
  name: string
  specialty: string | null
  cedula: string | null
  phone: string | null
  bank_account: string | null
  bank_name: string | null
  payment_method: 'cash' | 'check' | 'transfer'
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  rnc: string | null
  contact_phone: string | null
  bank_account: string | null
  bank_name: string | null
  payment_terms: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  owner_name: string
  bank_name: string
  account_number: string
  account_type: string | null
  cedula_rnc: string | null
  is_internal: boolean
  project_id: string | null
}

export interface BudgetCategory {
  id: string
  project_id: string
  code: string
  name: string
  sort_order: number
  budgeted_amount: number
}

export interface BudgetItem {
  id: string
  budget_category_id: string
  code: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  sort_order: number
  notes: string | null
}

export type PriceListCategory = 'material' | 'labor' | 'equipment'

export interface PriceListItem {
  id: string
  project_id: string
  category: PriceListCategory
  code: string | null
  description: string
  unit: string
  unit_price: number
}

export type PayrollStatus = 'draft' | 'submitted' | 'approved' | 'paid'

export interface PayrollPeriod {
  id: string
  project_id: string
  period_number: number
  report_date: string
  reported_by: string | null
  status: PayrollStatus
  total_labor: number
  total_materials: number
  total_indirect: number
  grand_total: number
  notes: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
  project?: Project
  labor_line_items?: LaborLineItem[]
  material_invoices?: MaterialInvoice[]
  indirect_costs?: IndirectCost[]
}

export interface LaborLineItem {
  id: string
  payroll_period_id: string
  contractor_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  is_advance: boolean
  is_advance_deduction: boolean
  sort_order: number
  notes: string | null
  contractor?: Contractor
}

export interface MaterialInvoice {
  id: string
  payroll_period_id: string
  supplier_id: string
  description: string
  invoice_reference: string | null
  amount: number
  budget_category_id: string | null
  attachment_path: string | null
  notes: string | null
  supplier?: Supplier
}

export interface IndirectCost {
  id: string
  payroll_period_id: string
  type: string
  description: string | null
  percentage: number | null
  base_amount: number | null
  calculated_amount: number
  fixed_amount: number | null
  notes: string | null
}

export interface PaymentDistribution {
  id: string
  payroll_period_id: string
  bank_account_id: string
  amount: number
  payment_method: 'deposit' | 'transfer' | 'check' | 'cash'
  beneficiary: string | null
  check_number: string | null
  status: 'pending' | 'completed' | 'cancelled'
  instructions: string | null
  completed_at: string | null
  bank_account?: BankAccount
}

export interface Transaction {
  id: string
  project_id: string
  date: string
  budget_category_id: string | null
  description: string
  supplier_id: string | null
  quantity: number | null
  unit_price: number | null
  total: number
  payment_condition: string | null
  invoice_number: string | null
  check_number: string | null
  bank: string | null
  cashed_date: string | null
  payroll_period_id: string | null
  notes: string | null
  created_at: string
}

export interface QualityControl {
  id: string
  project_id: string
  element: string
  pour_date: string
  test_date: string | null
  test_age: string | null
  actual_resistance: number | null
  expected_resistance: number | null
  concrete_supplier: string | null
  laboratory: string | null
  status: 'passed' | 'failed' | null
  notes: string | null
}

export interface ContractCubication {
  id: string
  project_id: string
  contractor_id: string
  specialty: string
  original_budget: number | null
  adjusted_budget: number | null
  total_advanced: number
  remaining: number
  completion_percent: number
  contractor?: Contractor
}

export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Company> }
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> }
      contractors: { Row: Contractor; Insert: Omit<Contractor, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Contractor> }
      suppliers: { Row: Supplier; Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Supplier> }
      bank_accounts: { Row: BankAccount; Insert: Omit<BankAccount, 'id'>; Update: Partial<BankAccount> }
      budget_categories: { Row: BudgetCategory; Insert: Omit<BudgetCategory, 'id'>; Update: Partial<BudgetCategory> }
      budget_items: { Row: BudgetItem; Insert: Omit<BudgetItem, 'id'>; Update: Partial<BudgetItem> }
      price_list_items: { Row: PriceListItem; Insert: Omit<PriceListItem, 'id'>; Update: Partial<PriceListItem> }
      payroll_periods: { Row: PayrollPeriod; Insert: Omit<PayrollPeriod, 'id' | 'created_at'>; Update: Partial<PayrollPeriod> }
      labor_line_items: { Row: LaborLineItem; Insert: Omit<LaborLineItem, 'id' | 'subtotal'>; Update: Partial<LaborLineItem> }
      material_invoices: { Row: MaterialInvoice; Insert: Omit<MaterialInvoice, 'id'>; Update: Partial<MaterialInvoice> }
      indirect_costs: { Row: IndirectCost; Insert: Omit<IndirectCost, 'id'>; Update: Partial<IndirectCost> }
      payment_distributions: { Row: PaymentDistribution; Insert: Omit<PaymentDistribution, 'id'>; Update: Partial<PaymentDistribution> }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> }
      quality_control: { Row: QualityControl; Insert: Omit<QualityControl, 'id' | 'status'>; Update: Partial<QualityControl> }
      contract_cubications: { Row: ContractCubication; Insert: Omit<ContractCubication, 'id' | 'remaining' | 'completion_percent'>; Update: Partial<ContractCubication> }
    }
  }
}
