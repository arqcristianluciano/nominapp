/**
 * Datos demo para TORRE MIRADOR DEL ESTE (projectId2) — reportes, presupuesto, control, calidad, etc.
 */
const P2 = 'p0000000-0000-0000-0000-000000000002'
const ct = (n: string) =>
  `ct000000-0000-0000-0000-00000000000${n}` as const
const sp = (n: string) =>
  `sp000000-0000-0000-0000-00000000000${n}` as const

const p2bc = (n: number) =>
  `bc000000-0000-0000-0000-0000000001${n.toString().padStart(2, '0')}`

const payroll4 = 'pp000000-0000-0000-0000-000000000004'
const payroll5 = 'pp000000-0000-0000-0000-000000000005'
const payroll6 = 'pp000000-0000-0000-0000-000000000006'

const projRef = { id: P2, name: 'TORRE MIRADOR DEL ESTE', code: 'TME-2026' }
const now = new Date().toISOString()

export const torreMiradorSeed = {
  budget_categories: [
    { id: p2bc(1), project_id: P2, code: 'T1 - PRELIMINARES', name: 'Preliminares y caseta', sort_order: 1, budgeted_amount: 420000 },
    { id: p2bc(2), project_id: P2, code: 'T2 - EXCAVACION', name: 'Excavación y muros pantalla', sort_order: 2, budgeted_amount: 1850000 },
    { id: p2bc(3), project_id: P2, code: 'T3 - ESTRUCTURA', name: 'Estructura hormigón armado', sort_order: 3, budgeted_amount: 8900000 },
    { id: p2bc(4), project_id: P2, code: 'T4 - FACHADA', name: 'Fachada cortina y aluminio', sort_order: 4, budgeted_amount: 3200000 },
    { id: p2bc(5), project_id: P2, code: 'T5 - ALBAÑILERIA', name: 'Albañilería y tabiques', sort_order: 5, budgeted_amount: 2100000 },
    { id: p2bc(6), project_id: P2, code: 'T6 - PLOMERIA', name: 'Plomería y fire fighting', sort_order: 6, budgeted_amount: 1650000 },
    { id: p2bc(7), project_id: P2, code: 'T7 - ELECTRICIDAD', name: 'Instalación eléctrica y datos', sort_order: 7, budgeted_amount: 1980000 },
    { id: p2bc(8), project_id: P2, code: 'T8 - ACABADOS', name: 'Acabados y drywall', sort_order: 8, budgeted_amount: 1450000 },
    { id: p2bc(9), project_id: P2, code: 'T9 - PISOS', name: 'Pisos y porcelanato', sort_order: 9, budgeted_amount: 980000 },
    { id: p2bc(10), project_id: P2, code: 'T10 - PINTURA', name: 'Pintura interior-exterior', sort_order: 10, budgeted_amount: 520000 },
    { id: p2bc(11), project_id: P2, code: 'T11 - ASCENSORES', name: 'Ascensores y montacargas', sort_order: 11, budgeted_amount: 2400000 },
    { id: p2bc(12), project_id: P2, code: 'T12 - DEPOSITOS', name: 'Depósitos socios', sort_order: 12, budgeted_amount: 0 },
    { id: p2bc(13), project_id: P2, code: 'T13 - INDIRECTOS', name: 'Gastos indirectos obra', sort_order: 13, budgeted_amount: 1200000 },
  ],

  payroll_periods: [
    {
      id: payroll4, project_id: P2, period_number: 1, report_date: '2026-02-20',
      reported_by: 'AT', status: 'paid', total_labor: 512000, total_materials: 685000,
      total_indirect: 142180, grand_total: 1339180, notes: 'Primera quincena torre — estructura niveles 1-3',
      created_at: '2026-02-20T10:00:00Z', approved_at: '2026-02-22T10:00:00Z', approved_by: 'Admin',
      project: projRef,
    },
    {
      id: payroll5, project_id: P2, period_number: 2, report_date: '2026-03-05',
      reported_by: 'AT', status: 'approved', total_labor: 448000, total_materials: 592400,
      total_indirect: 124892, grand_total: 1165292, notes: 'Segunda quincena — losas y mampostería',
      created_at: '2026-03-05T10:00:00Z', approved_at: '2026-03-07T10:00:00Z', approved_by: 'Admin',
      project: projRef,
    },
    {
      id: payroll6, project_id: P2, period_number: 3, report_date: '2026-03-20',
      reported_by: 'AT', status: 'draft', total_labor: 365000, total_materials: 421000,
      total_indirect: 101580, grand_total: 887580, notes: 'Borrador — instalaciones verticales',
      created_at: '2026-03-20T10:00:00Z', approved_at: null, approved_by: null,
      project: projRef,
    },
  ],

  labor_line_items: [
    { id: 't2li01', payroll_period_id: payroll4, contractor_id: ct('1'), description: 'ENCOFRADO Y VACIADO NÚCLEO ELEVADOR', quantity: 1, unit: 'PA', unit_price: 185000, subtotal: 185000, is_advance: false, is_advance_deduction: false, sort_order: 1, notes: null, contractor: { id: ct('1'), name: 'Lucio Almonte', specialty: 'Maestro constructor' } },
    { id: 't2li02', payroll_period_id: payroll4, contractor_id: ct('1'), description: 'LOSA NIVEL 3 — MANO DE OBRA', quantity: 1, unit: 'PA', unit_price: 220000, subtotal: 220000, is_advance: false, is_advance_deduction: false, sort_order: 2, notes: null, contractor: { id: ct('1'), name: 'Lucio Almonte', specialty: 'Maestro constructor' } },
    { id: 't2li03', payroll_period_id: payroll4, contractor_id: ct('3'), description: 'ELECTRODUCTOS Y CAJA PRINCIPAL N3', quantity: 1, unit: 'PA', unit_price: 107000, subtotal: 107000, is_advance: false, is_advance_deduction: false, sort_order: 3, notes: null, contractor: { id: ct('3'), name: 'Rafael Sánchez', specialty: 'Electricidad' } },
    { id: 't2li04', payroll_period_id: payroll5, contractor_id: ct('2'), description: 'TUBERÍA PP-R Y ACCESORIOS NIVELES 2-4', quantity: 1, unit: 'PA', unit_price: 198000, subtotal: 198000, is_advance: false, is_advance_deduction: false, sort_order: 1, notes: null, contractor: { id: ct('2'), name: 'Lenin Marte', specialty: 'Plomería e instalaciones' } },
    { id: 't2li05', payroll_period_id: payroll5, contractor_id: ct('1'), description: 'MUROS BLOQUE 6" NIVEL 4', quantity: 420, unit: 'M2', unit_price: 595, subtotal: 249900, is_advance: false, is_advance_deduction: false, sort_order: 2, notes: null, contractor: { id: ct('1'), name: 'Lucio Almonte', specialty: 'Maestro constructor' } },
    { id: 't2li06', payroll_period_id: payroll6, contractor_id: ct('4'), description: 'MOCK-UP FACHADA ALUMINIO MUESTRA', quantity: 1, unit: 'PA', unit_price: 95000, subtotal: 95000, is_advance: false, is_advance_deduction: false, sort_order: 1, notes: null, contractor: { id: ct('4'), name: 'Joan Pimentel', specialty: 'Ebanistería y carpintería' } },
  ],

  material_invoices: [
    { id: 't2mi01', payroll_period_id: payroll4, supplier_id: sp('4'), description: 'HORMIGÓN 280 KG/CM2 — BOMBA', invoice_reference: 'HN-2201', amount: 285000, budget_category_id: p2bc(3), attachment_path: null, notes: '32 m3', supplier: { id: sp('4'), name: 'Hormigones Nacionales' } },
    { id: 't2mi02', payroll_period_id: payroll4, supplier_id: sp('5'), description: 'VARILLAS 5/8" Y ESTRIVOS', invoice_reference: 'AC-9901', amount: 198000, budget_category_id: p2bc(3), attachment_path: null, notes: null, supplier: { id: sp('5'), name: 'Acero del Cibao' } },
    { id: 't2mi03', payroll_period_id: payroll5, supplier_id: sp('1'), description: 'CEMENTO + BLOQUE 6" LOTE TORRE', invoice_reference: 'FB-5100', amount: 312400, budget_category_id: p2bc(5), attachment_path: null, notes: null, supplier: { id: sp('1'), name: 'Ferretería Bellón' } },
  ],

  indirect_costs: [
    { id: 't2ic01', payroll_period_id: payroll4, type: 'direction_technique', description: 'Dirección técnica 8%', percentage: 8, base_amount: 1197000, calculated_amount: 95760, fixed_amount: null, notes: null },
    { id: 't2ic02', payroll_period_id: payroll4, type: 'administration', description: 'Administración 1.5%', percentage: 1.5, base_amount: 1197000, calculated_amount: 17955, fixed_amount: null, notes: null },
    { id: 't2ic03', payroll_period_id: payroll4, type: 'transport', description: 'Transporte 1%', percentage: 1, base_amount: 1197000, calculated_amount: 11970, fixed_amount: null, notes: null },
    { id: 't2ic04', payroll_period_id: payroll5, type: 'direction_technique', description: 'Dirección técnica 8%', percentage: 8, base_amount: 1040400, calculated_amount: 83232, fixed_amount: null, notes: null },
    { id: 't2ic05', payroll_period_id: payroll5, type: 'administration', description: 'Administración 1.5%', percentage: 1.5, base_amount: 1040400, calculated_amount: 15606, fixed_amount: null, notes: null },
    { id: 't2ic06', payroll_period_id: payroll5, type: 'transport', description: 'Transporte 1%', percentage: 1, base_amount: 1040400, calculated_amount: 10404, fixed_amount: null, notes: null },
  ],

  transactions: [
    { id: 't2tx01', project_id: P2, date: '2026-02-10', budget_category_id: p2bc(12), description: 'DEPÓSITO INICIAL TORRE — SOCIOS', supplier_id: null, quantity: 1, unit_price: 12000000, total: 12000000, payment_condition: 'Pago Transferencia', invoice_number: null, check_number: null, bank: 'Banco BHD León', cashed_date: '2026-02-10', payroll_period_id: null, notes: 'Capital proyecto torre', created_at: '2026-02-10T10:00:00Z', supplier: null, budget_category: { id: p2bc(12), code: 'T12 - DEPOSITOS', name: 'Depósitos socios' } },
    { id: 't2tx02', project_id: P2, date: '2026-02-18', budget_category_id: p2bc(3), description: 'HORMIGÓN ESTRUCTURA NÚCLEO (32 M3)', supplier_id: sp('4'), quantity: 32, unit_price: 8906, total: 285000, payment_condition: 'Pago Cheque', invoice_number: 'HN-2201', check_number: '002001', bank: 'Banco Santa Cruz', cashed_date: null, payroll_period_id: null, notes: null, created_at: '2026-02-18T10:00:00Z', supplier: { id: sp('4'), name: 'Hormigones Nacionales' }, budget_category: { id: p2bc(3), code: 'T3 - ESTRUCTURA', name: 'Estructura hormigón armado' } },
    { id: 't2tx03', project_id: P2, date: '2026-02-22', budget_category_id: p2bc(3), description: 'ACERO Y MALLA ELECTROSOLDADA', supplier_id: sp('5'), quantity: 1, unit_price: 198000, total: 198000, payment_condition: 'Credito por Factura', invoice_number: 'AC-9901', check_number: null, bank: null, cashed_date: null, payroll_period_id: null, notes: null, created_at: '2026-02-22T10:00:00Z', supplier: { id: sp('5'), name: 'Acero del Cibao' }, budget_category: { id: p2bc(3), code: 'T3 - ESTRUCTURA', name: 'Estructura hormigón armado' } },
    { id: 't2tx04', project_id: P2, date: '2026-03-01', budget_category_id: p2bc(5), description: 'BLOQUE 6" Y CEMENTO — MUROS N4', supplier_id: sp('1'), quantity: 1, unit_price: 312400, total: 312400, payment_condition: 'Credito por Factura', invoice_number: 'FB-5100', check_number: null, bank: null, cashed_date: null, payroll_period_id: null, notes: null, created_at: '2026-03-01T10:00:00Z', supplier: { id: sp('1'), name: 'Ferretería Bellón' }, budget_category: { id: p2bc(5), code: 'T5 - ALBAÑILERIA', name: 'Albañilería y tabiques' } },
    { id: 't2tx05', project_id: P2, date: '2026-03-08', budget_category_id: p2bc(4), description: 'PERFILES ALUMINIO MUESTRA FACHADA', supplier_id: sp('2'), quantity: 1, unit_price: 185000, total: 185000, payment_condition: 'Pago Transferencia', invoice_number: 'FO-5601', check_number: null, bank: 'Banco BHD León', cashed_date: '2026-03-08', payroll_period_id: null, notes: 'Mock-up cortina', created_at: '2026-03-08T10:00:00Z', supplier: { id: sp('2'), name: 'Ferretería Ochoa' }, budget_category: { id: p2bc(4), code: 'T4 - FACHADA', name: 'Fachada cortina y aluminio' } },
    { id: 't2tx06', project_id: P2, date: '2026-03-12', budget_category_id: p2bc(7), description: 'TABLERO PRINCIPAL Y BREAKERS TORRE', supplier_id: sp('3'), quantity: 1, unit_price: 224000, total: 224000, payment_condition: 'Credito por TC', invoice_number: 'FP-6001', check_number: null, bank: 'Banco BHD León', cashed_date: null, payroll_period_id: null, notes: null, created_at: '2026-03-12T10:00:00Z', supplier: { id: sp('3'), name: 'Ferretería Pappaterra' }, budget_category: { id: p2bc(7), code: 'T7 - ELECTRICIDAD', name: 'Instalación eléctrica y datos' } },
    { id: 't2tx07', project_id: P2, date: '2026-03-14', budget_category_id: p2bc(13), description: 'PAGO DT MARZO (8% ACUMULADO)', supplier_id: null, quantity: 1, unit_price: 95600, total: 95600, payment_condition: 'Pago Transferencia', invoice_number: null, check_number: null, bank: 'Banco Popular Dominicano', cashed_date: '2026-03-14', payroll_period_id: null, notes: null, created_at: '2026-03-14T10:00:00Z', supplier: null, budget_category: { id: p2bc(13), code: 'T13 - INDIRECTOS', name: 'Gastos indirectos obra' } },
  ],

  quality_control: [
    { id: 't2qc01', project_id: P2, element: 'PILOTES ZONA ESTE — GRUPO A', pour_date: '2026-02-01', test_date: '2026-03-01', test_age: '28 días', actual_resistance: 305, expected_resistance: 280, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Geoconsult Lab', status: 'passed', notes: null },
    { id: 't2qc02', project_id: P2, element: 'LOSA NIVEL 2 — ZONA COMERCIAL', pour_date: '2026-02-18', test_date: '2026-03-18', test_age: '28 días', actual_resistance: 268, expected_resistance: 280, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Geoconsult Lab', status: 'failed', notes: 'Curado deficiente en borde norte.' },
    { id: 't2qc03', project_id: P2, element: 'MURO NÚCLEO NIVEL 5', pour_date: '2026-03-10', test_date: null, test_age: '28 días', actual_resistance: null, expected_resistance: 280, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Geoconsult Lab', status: null, notes: 'Muestreo programado 07/04/2026' },
  ],

  budget_items: [
    { id: 't2bi01', budget_category_id: p2bc(2), code: 'T2.1', description: 'Excavación mecánica y acarreo', unit: 'M3', quantity: 2400, unit_price: 380, sort_order: 1, notes: null },
    { id: 't2bi02', budget_category_id: p2bc(2), code: 'T2.2', description: 'Muro pantalla 80cm — hormigón', unit: 'ML', quantity: 180, unit_price: 12500, sort_order: 2, notes: null },
    { id: 't2bi03', budget_category_id: p2bc(3), code: 'T3.1', description: 'Columnas perimetrales 40x80cm', unit: 'ML', quantity: 420, unit_price: 4200, sort_order: 1, notes: null },
    { id: 't2bi04', budget_category_id: p2bc(3), code: 'T3.2', description: 'Losas macizas niveles típicos e=25cm', unit: 'M2', quantity: 2800, unit_price: 1850, sort_order: 2, notes: null },
    { id: 't2bi05', budget_category_id: p2bc(4), code: 'T4.1', description: 'Vidrio laminado + estructura aluminio', unit: 'M2', quantity: 1850, unit_price: 1150, sort_order: 1, notes: null },
    { id: 't2bi06', budget_category_id: p2bc(11), code: 'T11.1', description: 'Ascensor pasajeros 8 paradas', unit: 'Und', quantity: 2, unit_price: 850000, sort_order: 1, notes: null },
  ],

  price_list_items: [
    { id: 't2pl01', project_id: P2, category: 'material', code: 'TME-M001', description: 'Hormigón 280 kg/cm2 (m3)', unit: 'M3', unit_price: 9200 },
    { id: 't2pl02', project_id: P2, category: 'material', code: 'TME-M002', description: 'Perfil aluminio fachada ventilada', unit: 'ML', unit_price: 1850 },
    { id: 't2pl03', project_id: P2, category: 'labor', code: 'TME-L001', description: 'Encofrador torre (día)', unit: 'Día', unit_price: 4200 },
    { id: 't2pl04', project_id: P2, category: 'equipment', code: 'TME-E001', description: 'Grúa torre — mes', unit: 'Mes', unit_price: 185000 },
  ],

  adjustment_contracts: [
    { id: 'ac05', project_id: P2, contractor_id: ct('1'), signed_date: '2026-02-05', retention_percent: 8, notes: 'Contrato estructural torre 12 niveles', created_at: '2026-02-05T10:00:00Z', contractor: { id: ct('1'), name: 'Lucio Almonte', specialty: 'Maestro constructor' } },
    { id: 'ac06', project_id: P2, contractor_id: ct('2'), signed_date: '2026-02-05', retention_percent: 8, notes: null, created_at: '2026-02-05T10:00:00Z', contractor: { id: ct('2'), name: 'Lenin Marte', specialty: 'Plomería e instalaciones' } },
    { id: 'ac07', project_id: P2, contractor_id: ct('3'), signed_date: '2026-02-08', retention_percent: 8, notes: null, created_at: '2026-02-08T10:00:00Z', contractor: { id: ct('3'), name: 'Rafael Sánchez', specialty: 'Electricidad' } },
    { id: 'ac08', project_id: P2, contractor_id: ct('4'), signed_date: '2026-02-10', retention_percent: 8, notes: 'Incluye fachada aluminio y vidrio', created_at: '2026-02-10T10:00:00Z', contractor: { id: ct('4'), name: 'Joan Pimentel', specialty: 'Ebanistería y carpintería' } },
  ],

  contract_partidas: [
    { id: 't2cp01', contract_id: 'ac05', description: 'ESTRUCTURA H.A. TORRE',            unit: 'm³',  unit_price: 9500,    agreed_quantity: 350, sort_order: 1 },
    { id: 't2cp02', contract_id: 'ac05', description: 'LOSAS ENTREPISO',                  unit: 'm²',  unit_price: 1400,    agreed_quantity: 820, sort_order: 2 },
    { id: 't2cp03', contract_id: 'ac06', description: 'SISTEMA PLOMERÍA VERTICAL',        unit: 'PA',  unit_price: 1250000, agreed_quantity: 1,   sort_order: 1 },
    { id: 't2cp04', contract_id: 'ac06', description: 'SISTEMA FIRE FIGHTING',            unit: 'PA',  unit_price: 430000,  agreed_quantity: 1,   sort_order: 2 },
    { id: 't2cp05', contract_id: 'ac07', description: 'INSTALACIÓN ELÉCTRICA TORRE',      unit: 'PA',  unit_price: 1980000, agreed_quantity: 1,   sort_order: 1 },
    { id: 't2cp06', contract_id: 'ac07', description: 'SISTEMA DE DATOS Y COMUNICACIONES',unit: 'PA',  unit_price: 420000,  agreed_quantity: 1,   sort_order: 2 },
    { id: 't2cp07', contract_id: 'ac08', description: 'FACHADA ALUMINIO Y VIDRIO',        unit: 'm²',  unit_price: 8500,    agreed_quantity: 380, sort_order: 1 },
    { id: 't2cp08', contract_id: 'ac08', description: 'CARPINTERÍA INTERIOR MADERA',      unit: 'und', unit_price: 22000,   agreed_quantity: 48,  sort_order: 2 },
  ],

  contract_cortes: [
    { id: 't2cc01', contract_id: 'ac05', partida_id: 't2cp01', cut_number: 1, cut_date: '2026-02-20', measured_quantity: 80,  amount: 760000,  retention_amount: 60800, status: 'paid',     notes: 'Estructura sótano y PB',      photo_url: null, approved_by: 'Roberto Peña', signature_data: 'data:image/png;base64,demo', linked_payroll_id: 'pp000000-0000-0000-0000-000000000004', created_at: '2026-02-20T10:00:00Z' },
    { id: 't2cc02', contract_id: 'ac05', partida_id: 't2cp01', cut_number: 2, cut_date: '2026-03-10', measured_quantity: 65,  amount: 617500,  retention_amount: 49400, status: 'approved', notes: 'Estructura niveles 1-2',      photo_url: 'https://images.unsplash.com/photo-1590844947391-2a44561cfc7b?w=800', approved_by: 'Ana Torres', signature_data: 'data:image/png;base64,demo', linked_payroll_id: null, created_at: '2026-03-10T10:00:00Z' },
    { id: 't2cc03', contract_id: 'ac05', partida_id: 't2cp02', cut_number: 3, cut_date: '2026-03-10', measured_quantity: 200, amount: 280000,  retention_amount: 22400, status: 'approved', notes: 'Losas PB y nivel 1',          photo_url: null, approved_by: 'Ana Torres', signature_data: 'data:image/png;base64,demo', linked_payroll_id: null, created_at: '2026-03-10T10:00:00Z' },
    { id: 't2cc04', contract_id: 'ac06', partida_id: 't2cp03', cut_number: 1, cut_date: '2026-03-01', measured_quantity: 0.4, amount: 500000,  retention_amount: 40000, status: 'paid',     notes: '40% avance plomería vertical',photo_url: null, approved_by: 'Roberto Peña', signature_data: 'data:image/png;base64,demo', linked_payroll_id: 'pp000000-0000-0000-0000-000000000004', created_at: '2026-03-01T10:00:00Z' },
    { id: 't2cc05', contract_id: 'ac07', partida_id: 't2cp05', cut_number: 1, cut_date: '2026-03-05', measured_quantity: 0.2, amount: 396000,  retention_amount: 31680, status: 'paid',     notes: '20% avance eléctrico',        photo_url: null, approved_by: 'Roberto Peña', signature_data: 'data:image/png;base64,demo', linked_payroll_id: 'pp000000-0000-0000-0000-000000000004', created_at: '2026-03-05T10:00:00Z' },
    { id: 't2cc06', contract_id: 'ac08', partida_id: 't2cp07', cut_number: 1, cut_date: '2026-03-15', measured_quantity: 80,  amount: 680000,  retention_amount: 54400, status: 'approved', notes: 'Fachada niveles 1-2',         photo_url: null, approved_by: 'Ana Torres', signature_data: 'data:image/png;base64,demo', linked_payroll_id: null, created_at: '2026-03-15T10:00:00Z' },
  ],

  contract_adelantos: [
    { id: 't2ca01', contract_id: 'ac05', advance_date: '2026-02-15', amount: 150000, description: 'Adelanto movilización obra', created_at: '2026-02-15T10:00:00Z' },
    { id: 't2ca02', contract_id: 'ac07', advance_date: '2026-02-20', amount: 80000,  description: 'Adelanto compra materiales eléctricos', created_at: '2026-02-20T10:00:00Z' },
  ],

  purchase_requisitions: [
    { id: 'req003', project_id: P2, req_number: 'REQ-2026-0041', description: 'Tubería y accesorios para plomería torre',  requested_by: 'Ana Torres', required_date: null,         status: 'needs_revision', notes: null,                      approved_quote_id: null, approved_by: null, approved_at: null, signature_data: null, rejection_reason: null, revision_notes: 'Conseguir también cotización de Acero del Cibao. El precio de Ochoa parece elevado para tubería SDR-26.', payment_type: null, ordered_at: null, created_at: '2026-03-20T08:00:00Z', updated_at: '2026-03-21T10:00:00Z', project: projRef },
    { id: 'req004', project_id: P2, req_number: 'REQ-2026-0055', description: 'Perfiles y vidrios fachada niveles 6-8',   requested_by: 'Ana Torres', required_date: '2026-04-05', status: 'draft',          notes: 'Cotizar vidrio laminado 6+6', approved_quote_id: null, approved_by: null, approved_at: null, signature_data: null, rejection_reason: null, revision_notes: null,                                                                                                                                payment_type: null, ordered_at: null, created_at: now,                    updated_at: now,                    project: projRef },
  ],

  purchase_quotes: [
    { id: 'qte007', requisition_id: 'req003', supplier_id: sp('2'), quote_number: 'FO-COT-0451', valid_until: null, subtotal: 62400, tax_percent: 18, total: 73632, negotiated_total: null, negotiated_notes: null, notes: null },
    { id: 'qte008', requisition_id: 'req003', supplier_id: sp('3'), quote_number: null,           valid_until: null, subtotal: 58900, tax_percent: 18, total: 69502, negotiated_total: null, negotiated_notes: null, notes: null },
  ],

  purchase_quote_items: [
    { id: 'qi13', quote_id: 'qte007', description: 'TUBERÍA PVC 3" SDR-26', quantity: 40, unit: 'Unidad', unit_price: 780, subtotal: 31200 },
    { id: 'qi14', quote_id: 'qte007', description: 'CODO 90° PVC 3"',       quantity: 24, unit: 'Unidad', unit_price: 130, subtotal: 3120 },
    { id: 'qi15', quote_id: 'qte007', description: 'PEGAMENTO PVC GALÓN',   quantity: 4,  unit: 'Galón',  unit_price: 720, subtotal: 2880 },
    { id: 'qi16', quote_id: 'qte007', description: 'VÁLVULA DE BOLA 3"',    quantity: 8,  unit: 'Unidad', unit_price: 650, subtotal: 5200 },
    { id: 'qi17', quote_id: 'qte008', description: 'TUBERÍA PVC 3" SDR-26', quantity: 40, unit: 'Unidad', unit_price: 740, subtotal: 29600 },
    { id: 'qi18', quote_id: 'qte008', description: 'CODO 90° PVC 3"',       quantity: 24, unit: 'Unidad', unit_price: 120, subtotal: 2880 },
    { id: 'qi19', quote_id: 'qte008', description: 'PEGAMENTO PVC GALÓN',   quantity: 4,  unit: 'Galón',  unit_price: 680, subtotal: 2720 },
    { id: 'qi20', quote_id: 'qte008', description: 'VÁLVULA DE BOLA 3"',    quantity: 8,  unit: 'Unidad', unit_price: 588, subtotal: 4700 },
  ],
}
