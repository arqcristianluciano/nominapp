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

  mercado_budgets: [],
  mercado_budget_lines: [],

  // --- Bitácora de obra ---
  bitacora_entries: [
    { id: 'bi0001', project_id: projectId1, date: '2026-03-25', weather: 'soleado', temp_c: 30, work_summary: 'Vaciado de columnas eje A-D. Se colocó hormigón f\'c=280 kg/cm² en 12 columnas. Sin incidentes.', workforce_count: 18, equipment: 'Mixer, vibradora, andamios', visitors: 'Ing. Ramírez (inspección)', incidents: null, notes: 'Clima favorable, avance según cronograma.', created_by: 'Admin', created_at: '2026-03-25T18:00:00Z' },
    { id: 'bi0002', project_id: projectId1, date: '2026-03-26', weather: 'nublado', temp_c: 27, work_summary: 'Instalación de encofrado para placa nivel 2. Colocación de acero de refuerzo grado 60.', workforce_count: 22, equipment: 'Martillo rotativo, andamios', visitors: null, incidents: 'Trabajador con corte menor en mano — tratado en sitio', notes: 'Se reforzó protocolo de EPP.', created_by: 'Admin', created_at: '2026-03-26T18:00:00Z' },
    { id: 'bi0003', project_id: projectId1, date: '2026-03-27', weather: 'lluvia', temp_c: 24, work_summary: 'Suspensión de vaciado por lluvia. Trabajos interiores: mampostería bloque 6" en apartamento 1-A.', workforce_count: 12, equipment: 'Mezcladora de mortero', visitors: null, incidents: null, notes: 'Lluvia desde las 11am. Se cubrió el acero expuesto.', created_by: 'Admin', created_at: '2026-03-27T18:00:00Z' },
    { id: 'bi0004', project_id: projectId2, date: '2026-03-25', weather: 'soleado', temp_c: 31, work_summary: 'Cimentación nivel -1. Excavación completada eje 1-5. Colocación de plantilla de concreto pobre.', workforce_count: 25, equipment: 'Retroexcavadora, compresor', visitors: 'Cliente Lic. Torres (recorrido)', incidents: null, notes: 'Cliente satisfecho con el avance.', created_by: 'Admin', created_at: '2026-03-25T18:00:00Z' },
  ],

  // --- Asistencia diaria ---
  attendance_records: [
    { id: 'at0001', project_id: projectId1, date: '2026-03-27', contractor_id: contractor1, workers_count: 8,  hours_worked: 8, activity: 'Vaciado columnas', notes: null, created_at: '2026-03-27T18:00:00Z' },
    { id: 'at0002', project_id: projectId1, date: '2026-03-27', contractor_id: contractor2, workers_count: 4,  hours_worked: 8, activity: 'Plomería PVC 4"', notes: null, created_at: '2026-03-27T18:00:00Z' },
    { id: 'at0003', project_id: projectId1, date: '2026-03-26', contractor_id: contractor1, workers_count: 10, hours_worked: 9, activity: 'Encofrado placa nivel 2', notes: 'Hora extra aprobada', created_at: '2026-03-26T18:00:00Z' },
    { id: 'at0004', project_id: projectId1, date: '2026-03-26', contractor_id: contractor3, workers_count: 3,  hours_worked: 8, activity: 'Instalación panel eléctrico', notes: null, created_at: '2026-03-26T18:00:00Z' },
    { id: 'at0005', project_id: projectId2, date: '2026-03-27', contractor_id: contractor1, workers_count: 14, hours_worked: 8, activity: 'Excavación cimentación', notes: null, created_at: '2026-03-27T18:00:00Z' },
  ],

  // --- Inventario de materiales ---
  inventory_items: [
    { id: 'inv001', project_id: projectId1, name: 'Cemento Portland Tipo I', unit: 'sacos', current_stock: 120, min_stock: 50, unit_cost: 580, created_at: now },
    { id: 'inv002', project_id: projectId1, name: 'Varilla #4 (1/2")',         unit: 'unid',  current_stock: 200, min_stock: 100, unit_cost: 450, created_at: now },
    { id: 'inv003', project_id: projectId1, name: 'Bloque 6"',                unit: 'unid',  current_stock: 800, min_stock: 300, unit_cost: 45,  created_at: now },
    { id: 'inv004', project_id: projectId1, name: 'Arena (m³)',               unit: 'm³',    current_stock: 15,  min_stock: 10,  unit_cost: 2800, created_at: now },
    { id: 'inv005', project_id: projectId1, name: 'Piedra triturada 3/4"',    unit: 'm³',    current_stock: 8,   min_stock: 10,  unit_cost: 3200, created_at: now },
    { id: 'inv006', project_id: projectId2, name: 'Cemento Portland Tipo I',  unit: 'sacos', current_stock: 90,  min_stock: 60,  unit_cost: 580,  created_at: now },
    { id: 'inv007', project_id: projectId2, name: 'Varilla #5 (5/8")',         unit: 'unid',  current_stock: 150, min_stock: 80,  unit_cost: 720,  created_at: now },
  ],

  inventory_movements: [
    { id: 'im0001', item_id: 'inv001', project_id: projectId1, type: 'in',  quantity: 200, date: '2026-03-20', supplier_id: supplier1, notes: 'Compra #OC-001', created_at: '2026-03-20T10:00:00Z' },
    { id: 'im0002', item_id: 'inv001', project_id: projectId1, type: 'out', quantity: 80,  date: '2026-03-25', supplier_id: null,      notes: 'Vaciado columnas eje A-D', created_at: '2026-03-25T14:00:00Z' },
    { id: 'im0003', item_id: 'inv002', project_id: projectId1, type: 'in',  quantity: 300, date: '2026-03-18', supplier_id: supplier5, notes: 'Compra acero estructural', created_at: '2026-03-18T10:00:00Z' },
    { id: 'im0004', item_id: 'inv002', project_id: projectId1, type: 'out', quantity: 100, date: '2026-03-26', supplier_id: null,      notes: 'Encofrado placa nivel 2', created_at: '2026-03-26T12:00:00Z' },
    { id: 'im0005', item_id: 'inv005', project_id: projectId1, type: 'out', quantity: 7,   date: '2026-03-27', supplier_id: null,      notes: 'Mezcla vaciado', created_at: '2026-03-27T09:00:00Z' },
  ],

  // --- Cronograma de obra ---
  schedule_tasks: [
    { id: 'sc0001', project_id: projectId1, name: 'Cimentación y fundaciones', start_date: '2026-01-15', end_date: '2026-02-15', progress: 100, color: '#3b82f6', notes: 'Completado', created_at: now },
    { id: 'sc0002', project_id: projectId1, name: 'Estructura nivel 1',        start_date: '2026-02-10', end_date: '2026-03-15', progress: 100, color: '#10b981', notes: 'Completado con 2 días de retraso', created_at: now },
    { id: 'sc0003', project_id: projectId1, name: 'Estructura nivel 2',        start_date: '2026-03-10', end_date: '2026-04-20', progress: 65,  color: '#f59e0b', notes: 'En progreso', created_at: now },
    { id: 'sc0004', project_id: projectId1, name: 'Mampostería nivel 1',       start_date: '2026-03-01', end_date: '2026-04-10', progress: 40,  color: '#8b5cf6', notes: null, created_at: now },
    { id: 'sc0005', project_id: projectId1, name: 'Instalaciones eléctricas',  start_date: '2026-04-01', end_date: '2026-05-15', progress: 5,   color: '#f59e0b', notes: null, created_at: now },
    { id: 'sc0006', project_id: projectId1, name: 'Plomería y sanitaria',      start_date: '2026-04-01', end_date: '2026-05-01', progress: 0,   color: '#06b6d4', notes: null, created_at: now },
    { id: 'sc0007', project_id: projectId1, name: 'Acabados y pintura',        start_date: '2026-05-01', end_date: '2026-06-30', progress: 0,   color: '#ec4899', notes: null, created_at: now },
    { id: 'sc0008', project_id: projectId2, name: 'Cimentación nivel -1',      start_date: '2026-02-01', end_date: '2026-03-15', progress: 80,  color: '#3b82f6', notes: 'En progreso', created_at: now },
    { id: 'sc0009', project_id: projectId2, name: 'Estructura pilotes',        start_date: '2026-03-01', end_date: '2026-04-30', progress: 20,  color: '#10b981', notes: null, created_at: now },
    { id: 'sc0010', project_id: projectId2, name: 'Planta baja y acceso',      start_date: '2026-04-15', end_date: '2026-06-01', progress: 0,   color: '#8b5cf6', notes: null, created_at: now },
  ],

  // --- Documentos de contratistas ---
  contractor_documents: [
    { id: 'cd0001', contractor_id: contractor1, doc_type: 'cedula',           name: 'Cédula de identidad',        file_ref: null, expiry_date: null,         status: 'valid',   notes: null, created_at: now },
    { id: 'cd0002', contractor_id: contractor1, doc_type: 'seguro',           name: 'Seguro riesgos laborales',   file_ref: null, expiry_date: '2026-12-31', status: 'valid',   notes: 'ARS Humano', created_at: now },
    { id: 'cd0003', contractor_id: contractor1, doc_type: 'contrato',         name: 'Contrato de servicios RC',   file_ref: null, expiry_date: '2026-08-31', status: 'valid',   notes: null, created_at: now },
    { id: 'cd0004', contractor_id: contractor2, doc_type: 'cedula',           name: 'Cédula de identidad',        file_ref: null, expiry_date: null,         status: 'valid',   notes: null, created_at: now },
    { id: 'cd0005', contractor_id: contractor2, doc_type: 'seguro',           name: 'Seguro riesgos laborales',   file_ref: null, expiry_date: '2026-04-15', status: 'expiring', notes: 'Vence pronto', created_at: now },
    { id: 'cd0006', contractor_id: contractor3, doc_type: 'licencia',         name: 'Licencia CODIA',             file_ref: null, expiry_date: '2025-12-31', status: 'expired', notes: 'Requiere renovación urgente', created_at: now },
    { id: 'cd0007', contractor_id: contractor3, doc_type: 'cedula',           name: 'Cédula de identidad',        file_ref: null, expiry_date: null,         status: 'valid',   notes: null, created_at: now },
    { id: 'cd0008', contractor_id: contractor4, doc_type: 'cedula',           name: 'Cédula de identidad',        file_ref: null, expiry_date: null,         status: 'valid',   notes: null, created_at: now },
  ],
}
