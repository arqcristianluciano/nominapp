import { capulloSeed } from './seedCapullo'
import { torreMiradorSeed } from './seedTorreMirador'

// Seed data for demo mode — realistic Dominican construction project data

const companyId   = 'c0000000-0000-0000-0000-000000000001'
const projectId1  = 'p0000000-0000-0000-0000-000000000001'
const projectId2  = 'p0000000-0000-0000-0000-000000000002'

const contractor1 = 'ct000000-0000-0000-0000-000000000001'
const contractor2 = 'ct000000-0000-0000-0000-000000000002'
const contractor3 = 'ct000000-0000-0000-0000-000000000003'
const contractor4 = 'ct000000-0000-0000-0000-000000000004'

const supplier1 = 'sp000000-0000-0000-0000-000000000001'
const supplier2 = 'sp000000-0000-0000-0000-000000000002'
const supplier3 = 'sp000000-0000-0000-0000-000000000003'
const supplier4 = 'sp000000-0000-0000-0000-000000000004'
const supplier5 = 'sp000000-0000-0000-0000-000000000005'

const bank1 = 'ba000000-0000-0000-0000-000000000001'
const bank2 = 'ba000000-0000-0000-0000-000000000002'

const now = new Date().toISOString()
const company = { id: companyId, name: 'Constructora Quisqueya SRL', rnc: '130-45678-9', created_at: now, updated_at: now }

export const SEED_DATA: Record<string, any[]> = {
  companies: [company],

  projects: [
    {
      id: projectId1, company_id: companyId, name: 'RESIDENCIAL CAPULLO',    code: 'RC-2026',
      location: 'Arroyo Hondo, Santo Domingo',    status: 'active',
      dt_percent: 10, admin_percent: 1,   transport_percent: 0.5, planning_fee: 25000,
      created_at: '2026-01-15T10:00:00Z', updated_at: now, company,
    },
    {
      id: projectId2, company_id: companyId, name: 'TORRE MIRADOR DEL ESTE', code: 'TME-2026',
      location: 'Los Cacicazgos, Santo Domingo',  status: 'active',
      dt_percent: 8,  admin_percent: 1.5, transport_percent: 1,   planning_fee: 50000,
      created_at: '2026-02-01T10:00:00Z', updated_at: now, company,
    },
  ],

  contractors: [
    { id: contractor1, name: 'Lucio Almonte',   specialty: 'Maestro constructor',       cedula: '001-1234567-8', phone: '809-555-0101', bank_account: '123456789', bank_name: 'Banco Popular Dominicano', payment_method: 'transfer', is_active: true, notes: null,                      created_at: now, updated_at: now },
    { id: contractor2, name: 'Lenin Marte',     specialty: 'Plomería e instalaciones',  cedula: '001-2345678-9', phone: '809-555-0202', bank_account: null,        bank_name: null,                      payment_method: 'cash',     is_active: true, notes: 'Botes y movimientos de tierra', created_at: now, updated_at: now },
    { id: contractor3, name: 'Rafael Sánchez',  specialty: 'Electricidad',              cedula: '001-3456789-0', phone: '829-555-0303', bank_account: '987654321', bank_name: 'Banco BHD León',           payment_method: 'check',    is_active: true, notes: null,                      created_at: now, updated_at: now },
    { id: contractor4, name: 'Joan Pimentel',   specialty: 'Ebanistería y carpintería', cedula: '001-4567890-1', phone: '849-555-0404', bank_account: null,        bank_name: null,                      payment_method: 'cash',     is_active: true, notes: 'Madera y puertas',        created_at: now, updated_at: now },
  ],

  suppliers: [
    { id: supplier1, name: 'Ferretería Bellón',     rnc: '101-23456-7', contact_phone: '809-555-1001', bank_account: null,        bank_name: null,                   payment_terms: 'Crédito 30 días',  is_active: true, created_at: now, updated_at: now },
    { id: supplier2, name: 'Ferretería Ochoa',      rnc: '101-34567-8', contact_phone: '809-555-1002', bank_account: null,        bank_name: null,                   payment_terms: 'Crédito 15 días',  is_active: true, created_at: now, updated_at: now },
    { id: supplier3, name: 'Ferretería Pappaterra', rnc: '101-45678-9', contact_phone: '809-555-1003', bank_account: null,        bank_name: null,                   payment_terms: 'Contado',          is_active: true, created_at: now, updated_at: now },
    { id: supplier4, name: 'Hormigones Nacionales', rnc: '101-56789-0', contact_phone: '809-555-1004', bank_account: '112233445', bank_name: 'Banco de Reservas',    payment_terms: 'Contra entrega',   is_active: true, created_at: now, updated_at: now },
    { id: supplier5, name: 'Acero del Cibao',       rnc: '101-67890-1', contact_phone: '809-555-1005', bank_account: null,        bank_name: null,                   payment_terms: 'Crédito 30 días',  is_active: true, created_at: now, updated_at: now },
  ],

  bank_accounts: [
    { id: bank1, owner_name: 'Constructora Quisqueya SRL', bank_name: 'Banco Santa Cruz', account_number: '8001-2345-6789', account_type: 'Corriente', cedula_rnc: '130-45678-9', is_internal: true, project_id: null },
    { id: bank2, owner_name: 'Constructora Quisqueya SRL', bank_name: 'Banco BHD León',   account_number: '2700-1234-5678', account_type: 'Ahorro',    cedula_rnc: '130-45678-9', is_internal: true, project_id: null },
  ],

  budget_categories:    [...capulloSeed.budget_categories,    ...torreMiradorSeed.budget_categories],
  payroll_periods:      [...capulloSeed.payroll_periods,      ...torreMiradorSeed.payroll_periods],
  labor_line_items:     [...capulloSeed.labor_line_items,     ...torreMiradorSeed.labor_line_items],
  material_invoices:    [...capulloSeed.material_invoices,    ...torreMiradorSeed.material_invoices],
  indirect_costs:       [...capulloSeed.indirect_costs,       ...torreMiradorSeed.indirect_costs],
  payment_distributions: [],
  transactions:         [...capulloSeed.transactions,         ...torreMiradorSeed.transactions],
  quality_control:      [...capulloSeed.quality_control,      ...torreMiradorSeed.quality_control],
  budget_items:         [...capulloSeed.budget_items,         ...torreMiradorSeed.budget_items],
  price_list_items:     [...capulloSeed.price_list_items,     ...torreMiradorSeed.price_list_items],
  adjustment_contracts: [...capulloSeed.adjustment_contracts, ...torreMiradorSeed.adjustment_contracts],
  contract_partidas:    [...capulloSeed.contract_partidas,    ...torreMiradorSeed.contract_partidas],
  contract_cortes:      [...capulloSeed.contract_cortes,      ...torreMiradorSeed.contract_cortes],
  contract_adelantos:   [...capulloSeed.contract_adelantos,   ...torreMiradorSeed.contract_adelantos],
  purchase_requisitions:[...capulloSeed.purchase_requisitions,...torreMiradorSeed.purchase_requisitions],
  purchase_quotes:      [...capulloSeed.purchase_quotes,      ...torreMiradorSeed.purchase_quotes],
  purchase_quote_items: [...capulloSeed.purchase_quote_items, ...torreMiradorSeed.purchase_quote_items],

  contractor_loans: [
    {
      id: 'ln000000-0000-0000-0000-000000000001',
      contractor_id: contractor1,
      principal: 30000,
      interest_rate: 5,
      installments: 6,
      installment_amount: 5250,   // 30000 * 1.05 / 6
      disbursed_date: '2026-01-20',
      status: 'active',
      notes: 'Préstamo para reparación de vehículo',
      created_at: now,
    },
    {
      id: 'ln000000-0000-0000-0000-000000000002',
      contractor_id: contractor2,
      principal: 15000,
      interest_rate: 3,
      installments: 3,
      installment_amount: 5150,   // 15000 * 1.03 / 3
      disbursed_date: '2026-02-10',
      status: 'active',
      notes: 'Gastos médicos',
      created_at: now,
    },
  ],

  loan_deductions: [],
}
