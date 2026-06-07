export interface Company {
  id: string
  name: string
  rnc: string | null
  created_at: string
  updated_at: string
}

export type CustomIndirectType = 'percent' | 'fixed'

export interface CustomIndirect {
  id: string
  name: string
  type: CustomIndirectType
  value: number
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
  custom_indirects: CustomIndirect[]
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
  parent_contractor_id?: string | null
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
  /** Tipo de cuenta bancaria: 'ahorros' | 'corriente'. NULL si no se declaró. */
  tipo_cuenta: 'ahorros' | 'corriente' | null
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
  start_date: string | null
  end_date: string | null
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
  start_date: string | null
  end_date: string | null
}

export type PriceListCategory = 'material' | 'labor' | 'equipment' | 'adjustment'

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
  budget_category_id: string | null
  budget_item_id: string | null
  created_by: string | null
  contractor?: Contractor
  budget_category?: { code: string; name: string } | null
  budget_item?: { code: string | null; description: string } | null
  /** Derivado (no es columna): nombre del autor resuelto desde user_profiles. */
  creator_name?: string | null
}

export interface MaterialInvoice {
  id: string
  payroll_period_id: string
  supplier_id: string
  description: string
  invoice_reference: string | null
  amount: number
  budget_category_id: string | null
  budget_item_id: string | null
  attachment_path: string | null
  notes: string | null
  created_by: string | null
  supplier?: Supplier
  items?: MaterialInvoiceItem[]
  budget_category?: { code: string; name: string } | null
  budget_item?: { code: string | null; description: string } | null
  /** Derivado (no es columna): nombre del autor resuelto desde user_profiles. */
  creator_name?: string | null
}

export interface MaterialInvoiceItem {
  id: string
  material_invoice_id: string
  description: string
  amount: number
  sort_order: number
  created_at?: string
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
  is_active: boolean
  /** true = indirecto agregado a mano (monto fijo); el recálculo no lo toca. */
  is_manual: boolean
  notes: string | null
}

export interface PaymentDistribution {
  id: string
  payroll_period_id: string
  /** Cuenta bancaria interna (flujo legacy). Opcional: hoy el pago se asigna a un beneficiario. */
  bank_account_id: string | null
  amount: number
  payment_method: 'deposit' | 'transfer' | 'check' | 'cash'
  /** Nombre del beneficiario (contratista o proveedor). */
  beneficiary: string | null
  beneficiary_type: 'contractor' | 'supplier' | null
  beneficiary_id: string | null
  /** Documento del beneficiario (cédula del contratista o RNC del proveedor). */
  beneficiary_doc: string | null
  /** Snapshot de los datos bancarios del beneficiario al momento del pago. */
  bank_name: string | null
  bank_account: string | null
  check_number: string | null
  status: 'pending' | 'completed' | 'cancelled'
  instructions: string | null
  completed_at: string | null
}

export interface Transaction {
  id: string
  project_id: string
  date: string
  budget_category_id: string | null
  budget_item_id: string | null
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
  comprobante_url: string | null
}

// --- Módulo de Cubicación (rediseño v2) ---

export interface AdjustmentContract {
  id: string
  project_id: string
  contractor_id: string
  signed_date: string | null
  retention_percent: number
  notes: string | null
  created_at: string
  contractor?: Contractor
}

export interface ContractPartida {
  id: string
  contract_id: string
  description: string
  unit: string
  unit_price: number
  agreed_quantity: number
  sort_order: number
}

export type CorteStatus = 'draft' | 'approved' | 'paid'

export interface ContractCorte {
  id: string
  contract_id: string
  partida_id: string
  cut_number: number
  cut_date: string
  measured_quantity: number
  amount: number
  retention_amount: number
  status: CorteStatus
  notes: string | null
  photo_url: string | null
  approved_by: string | null
  signature_data: string | null
  linked_payroll_id: string | null
  created_at: string
  partida?: ContractPartida
}

export interface ContractAdelanto {
  id: string
  contract_id: string
  advance_date: string
  amount: number
  description: string | null
  created_at: string
}

export type LoanStatus = 'active' | 'paid' | 'cancelled'
export type LoanFrecuencia = 'semanal' | 'quincenal' | 'mensual'
export type LoanInstallmentEstado = 'pendiente' | 'pagada'

export interface ContractorLoan {
  id: string
  contractor_id: string
  principal: number
  interest_rate: number
  installments: number
  installment_amount: number
  disbursed_date: string
  status: LoanStatus
  frecuencia: LoanFrecuencia
  disbursement_account_id: string | null
  notes: string | null
  created_at: string
  contractor?: Contractor
  disbursement_account?: BankAccount
}

export interface LoanInstallment {
  id: string
  loan_id: string
  numero_cuota: number
  fecha_pago_programada: string
  fecha_pago_real: string | null
  monto: number
  estado: LoanInstallmentEstado
  cuenta_cobro_id: string | null
  created_at: string
  cuenta_cobro?: BankAccount
}

export interface LoanDeduction {
  id: string
  loan_id: string
  payroll_period_id: string
  contractor_id: string
  amount: number
  created_at: string
  loan?: ContractorLoan
}

/** Tipo de movimiento: 'debito' = salida de dinero, 'credito' = entrada de dinero. */
export type AccountMovementTipo = 'debito' | 'credito'

/** Fuente que generó el movimiento */
export type AccountMovementOrigen = 'loan_disbursement' | 'loan_repayment' | 'manual'

/** Fila de la tabla account_movements (migración 081). */
export interface AccountMovement {
  id: string
  account_id: string
  fecha: string
  tipo: AccountMovementTipo
  monto: number
  concepto: string
  origen: AccountMovementOrigen | string
  referencia_id: string | null
  created_at: string
  /** Relación optional: cuenta bancaria relacionada */
  account?: BankAccount
}

export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Company> }
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> }
      contractors: {
        Row: Contractor
        Insert: Omit<Contractor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Contractor>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Supplier>
      }
      bank_accounts: { Row: BankAccount; Insert: Omit<BankAccount, 'id'>; Update: Partial<BankAccount> }
      budget_categories: { Row: BudgetCategory; Insert: Omit<BudgetCategory, 'id'>; Update: Partial<BudgetCategory> }
      budget_items: { Row: BudgetItem; Insert: Omit<BudgetItem, 'id'>; Update: Partial<BudgetItem> }
      price_list_items: { Row: PriceListItem; Insert: Omit<PriceListItem, 'id'>; Update: Partial<PriceListItem> }
      payroll_periods: {
        Row: PayrollPeriod
        Insert: Omit<PayrollPeriod, 'id' | 'created_at'>
        Update: Partial<PayrollPeriod>
      }
      labor_line_items: {
        Row: LaborLineItem
        Insert: Omit<LaborLineItem, 'id' | 'subtotal' | 'created_by' | 'creator_name'>
        Update: Partial<LaborLineItem>
      }
      material_invoices: {
        Row: MaterialInvoice
        Insert: Omit<MaterialInvoice, 'id' | 'created_by' | 'creator_name'>
        Update: Partial<MaterialInvoice>
      }
      material_invoice_items: {
        Row: MaterialInvoiceItem
        Insert: Omit<MaterialInvoiceItem, 'id' | 'created_at'>
        Update: Partial<MaterialInvoiceItem>
      }
      indirect_costs: { Row: IndirectCost; Insert: Omit<IndirectCost, 'id'>; Update: Partial<IndirectCost> }
      payment_distributions: {
        Row: PaymentDistribution
        Insert: Omit<PaymentDistribution, 'id'>
        Update: Partial<PaymentDistribution>
      }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> }
      quality_control: {
        Row: QualityControl
        Insert: Omit<QualityControl, 'id' | 'status'>
        Update: Partial<QualityControl>
      }
      adjustment_contracts: {
        Row: AdjustmentContract
        Insert: Omit<AdjustmentContract, 'id' | 'created_at'>
        Update: Partial<AdjustmentContract>
      }
      contract_partidas: { Row: ContractPartida; Insert: Omit<ContractPartida, 'id'>; Update: Partial<ContractPartida> }
      contract_cortes: {
        Row: ContractCorte
        Insert: Omit<ContractCorte, 'id' | 'created_at'>
        Update: Partial<ContractCorte>
      }
      contract_adelantos: {
        Row: ContractAdelanto
        Insert: Omit<ContractAdelanto, 'id' | 'created_at'>
        Update: Partial<ContractAdelanto>
      }
      contractor_loans: {
        Row: ContractorLoan
        Insert: Omit<ContractorLoan, 'id' | 'created_at' | 'contractor' | 'disbursement_account'>
        Update: Partial<ContractorLoan>
      }
      loan_installments: {
        Row: LoanInstallment
        Insert: Omit<LoanInstallment, 'id' | 'created_at' | 'cuenta_cobro'>
        Update: Partial<LoanInstallment>
      }
      loan_deductions: {
        Row: LoanDeduction
        Insert: Omit<LoanDeduction, 'id' | 'created_at' | 'loan'>
        Update: Partial<LoanDeduction>
      }
      account_movements: {
        Row: AccountMovement
        Insert: Omit<AccountMovement, 'id' | 'created_at' | 'account'>
        Update: Partial<AccountMovement>
      }
    }
  }
}
