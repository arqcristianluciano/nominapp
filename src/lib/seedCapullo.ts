/**
 * Datos demo para RESIDENCIAL CAPULLO (project 1)
 */
const P1 = 'p0000000-0000-0000-0000-000000000001'
const bc = (n: number) => `bc000000-0000-0000-0000-0000000000${n.toString().padStart(2, '0')}`

const ct1 = 'ct000000-0000-0000-0000-000000000001'
const ct2 = 'ct000000-0000-0000-0000-000000000002'
const ct3 = 'ct000000-0000-0000-0000-000000000003'
const ct4 = 'ct000000-0000-0000-0000-000000000004'

const sp1 = 'sp000000-0000-0000-0000-000000000001'
const sp2 = 'sp000000-0000-0000-0000-000000000002'
const sp3 = 'sp000000-0000-0000-0000-000000000003'
const sp4 = 'sp000000-0000-0000-0000-000000000004'
const sp5 = 'sp000000-0000-0000-0000-000000000005'

const payroll1 = 'pp000000-0000-0000-0000-000000000001'
const payroll2 = 'pp000000-0000-0000-0000-000000000002'
const payroll3 = 'pp000000-0000-0000-0000-000000000003'

const projRef = { id: P1, name: 'RESIDENCIAL CAPULLO', code: 'RC-2026' }
const ctRef = (id: string, name: string, specialty: string) => ({ id, name, specialty })
const spRef = (id: string, name: string) => ({ id, name })

export const capulloSeed = {
  budget_categories: [
    { id: bc(1),  project_id: P1, code: '1 - PRELIMINARES',           name: 'Preliminares',               sort_order: 1,  budgeted_amount: 150000 },
    { id: bc(2),  project_id: P1, code: '2 - DEMOLICIONES',            name: 'Demoliciones',               sort_order: 2,  budgeted_amount: 80000 },
    { id: bc(3),  project_id: P1, code: '3 - ESTRUCTURA',              name: 'Estructura',                 sort_order: 3,  budgeted_amount: 1200000 },
    { id: bc(4),  project_id: P1, code: '4 - H.A.',                   name: 'Hormigón armado',            sort_order: 4,  budgeted_amount: 450000 },
    { id: bc(5),  project_id: P1, code: '5 - MUROS',                  name: 'Muros',                      sort_order: 5,  budgeted_amount: 600000 },
    { id: bc(6),  project_id: P1, code: '6 - TERMINACION DE SUPERFICIE', name: 'Terminación de superficie', sort_order: 6, budgeted_amount: 200000 },
    { id: bc(7),  project_id: P1, code: '7 - PLAFON',                 name: 'Plafón',                     sort_order: 7,  budgeted_amount: 120000 },
    { id: bc(8),  project_id: P1, code: '8 - PLOMERIA',               name: 'Plomería',                   sort_order: 8,  budgeted_amount: 350000 },
    { id: bc(9),  project_id: P1, code: '9 - TECHOS',                 name: 'Techos',                     sort_order: 9,  budgeted_amount: 180000 },
    { id: bc(10), project_id: P1, code: '10 - PISOS',                 name: 'Pisos',                      sort_order: 10, budgeted_amount: 500000 },
    { id: bc(11), project_id: P1, code: '11 - REVESTIMIENTOS',        name: 'Revestimientos',             sort_order: 11, budgeted_amount: 150000 },
    { id: bc(12), project_id: P1, code: '12 - ESCALERAS',             name: 'Escaleras',                  sort_order: 12, budgeted_amount: 85000 },
    { id: bc(13), project_id: P1, code: '13 - INST. ELECTRICA',       name: 'Instalación eléctrica',      sort_order: 13, budgeted_amount: 280000 },
    { id: bc(14), project_id: P1, code: '14 - INST. SANITARIA',       name: 'Instalación sanitaria',      sort_order: 14, budgeted_amount: 120000 },
    { id: bc(15), project_id: P1, code: '15 - HERRERIA',              name: 'Herrería',                   sort_order: 15, budgeted_amount: 200000 },
    { id: bc(16), project_id: P1, code: '16 - PORTAJE',               name: 'Portaje',                    sort_order: 16, budgeted_amount: 180000 },
    { id: bc(17), project_id: P1, code: '17 - VENTANAS',              name: 'Ventanas',                   sort_order: 17, budgeted_amount: 220000 },
    { id: bc(18), project_id: P1, code: '18 - PINTURA',               name: 'Pintura',                    sort_order: 18, budgeted_amount: 250000 },
    { id: bc(19), project_id: P1, code: '19 - DEPOSITOS',             name: 'Depósitos',                  sort_order: 19, budgeted_amount: 0 },
    { id: bc(20), project_id: P1, code: '20 - EQUIPAMIENTO',          name: 'Equipamiento',               sort_order: 20, budgeted_amount: 600000 },
    { id: bc(21), project_id: P1, code: '21 - CERRAJERIA',            name: 'Cerrajería',                 sort_order: 21, budgeted_amount: 45000 },
    { id: bc(22), project_id: P1, code: '22 - MISCELANEOS',           name: 'Misceláneos',                sort_order: 22, budgeted_amount: 300000 },
    { id: bc(23), project_id: P1, code: '23 - GASTOS INDIRECTOS',     name: 'Gastos indirectos',          sort_order: 23, budgeted_amount: 800000 },
  ],

  payroll_periods: [
    { id: payroll1, project_id: P1, period_number: 1, report_date: '2026-02-01', reported_by: 'CL', status: 'paid',     total_labor: 285000, total_materials: 412500, total_indirect: 80212, grand_total: 777712,  notes: 'Primera quincena febrero',   created_at: '2026-02-01T10:00:00Z', approved_at: '2026-02-03T10:00:00Z', approved_by: 'Admin', project: projRef },
    { id: payroll2, project_id: P1, period_number: 2, report_date: '2026-02-15', reported_by: 'CL', status: 'approved', total_labor: 195000, total_materials: 328000, total_indirect: 60045, grand_total: 583045,  notes: 'Segunda quincena febrero',   created_at: '2026-02-15T10:00:00Z', approved_at: '2026-02-17T10:00:00Z', approved_by: 'Admin', project: projRef },
    { id: payroll3, project_id: P1, period_number: 3, report_date: '2026-03-01', reported_by: 'CL', status: 'draft',    total_labor: 142000, total_materials: 256000, total_indirect: 45720, grand_total: 443720,  notes: 'Primera quincena marzo',     created_at: '2026-03-01T10:00:00Z', approved_at: null,                   approved_by: null,    project: projRef },
  ],

  labor_line_items: [
    { id: 'li01', payroll_period_id: payroll1, contractor_id: ct1, description: 'MANO DE OBRA MUROS PLANTA BAJA',   quantity: 1,  unit: 'PA', unit_price: 120000, subtotal: 120000, is_advance: false, is_advance_deduction: false, sort_order: 1, notes: null, contractor: ctRef(ct1, 'Lucio Almonte',  'Maestro constructor') },
    { id: 'li02', payroll_period_id: payroll1, contractor_id: ct1, description: 'COLUMNAS Y VIGAS NIVEL 2',         quantity: 1,  unit: 'PA', unit_price: 85000,  subtotal: 85000,  is_advance: false, is_advance_deduction: false, sort_order: 2, notes: null, contractor: ctRef(ct1, 'Lucio Almonte',  'Maestro constructor') },
    { id: 'li03', payroll_period_id: payroll1, contractor_id: ct2, description: 'INSTALACION TUBERIA PVC 4"',       quantity: 45, unit: 'ML', unit_price: 450,    subtotal: 20250,  is_advance: false, is_advance_deduction: false, sort_order: 3, notes: null, contractor: ctRef(ct2, 'Lenin Marte',   'Plomería e instalaciones') },
    { id: 'li04', payroll_period_id: payroll1, contractor_id: ct3, description: 'CABLEADO ELECTRICO PLANTA BAJA',   quantity: 1,  unit: 'PA', unit_price: 59750,  subtotal: 59750,  is_advance: false, is_advance_deduction: false, sort_order: 4, notes: null, contractor: ctRef(ct3, 'Rafael Sánchez', 'Electricidad') },
  ],

  material_invoices: [
    { id: 'mi01', payroll_period_id: payroll1, supplier_id: sp1, description: 'CEMENTO GRIS CIBAO X50',  invoice_reference: 'FB-4521', amount: 187500, budget_category_id: bc(5), attachment_path: null, notes: '250 fundas',    supplier: spRef(sp1, 'Ferretería Bellón') },
    { id: 'mi02', payroll_period_id: payroll1, supplier_id: sp4, description: 'HORMIGON 210 KG/CM2',     invoice_reference: 'HN-1122', amount: 135000, budget_category_id: bc(4), attachment_path: null, notes: '18 m3',         supplier: spRef(sp4, 'Hormigones Nacionales') },
    { id: 'mi03', payroll_period_id: payroll1, supplier_id: sp5, description: 'VARILLAS 3/8 Y 1/2',      invoice_reference: 'AC-8890', amount: 90000,  budget_category_id: bc(3), attachment_path: null, notes: '120 quintales', supplier: spRef(sp5, 'Acero del Cibao') },
  ],

  indirect_costs: [
    { id: 'ic01', payroll_period_id: payroll1, type: 'direction_technique', description: 'Dirección técnica 10%', percentage: 10,  base_amount: 697500, calculated_amount: 69750, fixed_amount: null, notes: null },
    { id: 'ic02', payroll_period_id: payroll1, type: 'administration',      description: 'Administración 1%',    percentage: 1,   base_amount: 697500, calculated_amount: 6975,  fixed_amount: null, notes: null },
    { id: 'ic03', payroll_period_id: payroll1, type: 'transport',           description: 'Transporte 0.5%',      percentage: 0.5, base_amount: 697500, calculated_amount: 3487,  fixed_amount: null, notes: null },
  ],

  transactions: [
    { id: 'tx01', project_id: P1, date: '2026-01-20', budget_category_id: bc(19), description: 'DEPOSITO INICIAL SOCIOS',          supplier_id: null, quantity: 1,   unit_price: 3500000, total: 3500000, payment_condition: 'Pago Transferencia',  invoice_number: null,      check_number: null,    bank: 'Banco Santa Cruz',          cashed_date: '2026-01-20', payroll_period_id: null, notes: 'Aporte capital socios',             created_at: '2026-01-20T10:00:00Z', supplier: null,            budget_category: { id: bc(19), code: '19 - DEPOSITOS',       name: 'Depósitos' } },
    { id: 'tx02', project_id: P1, date: '2026-02-28', budget_category_id: bc(19), description: 'SEGUNDO DEPOSITO SOCIOS',          supplier_id: null, quantity: 1,   unit_price: 1500000, total: 1500000, payment_condition: 'Pago Transferencia',  invoice_number: null,      check_number: null,    bank: 'Banco Santa Cruz',          cashed_date: '2026-02-28', payroll_period_id: null, notes: null,                                created_at: '2026-02-28T10:00:00Z', supplier: null,            budget_category: { id: bc(19), code: '19 - DEPOSITOS',       name: 'Depósitos' } },
    { id: 'tx03', project_id: P1, date: '2026-02-05', budget_category_id: bc(5),  description: 'CEMENTO GRIS CIBAO X 250 FUNDAS', supplier_id: sp1,  quantity: 250, unit_price: 750,     total: 187500,  payment_condition: 'Credito por Factura', invoice_number: 'FB-4521', check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-02-05T10:00:00Z', supplier: spRef(sp1, 'Ferretería Bellón'),     budget_category: { id: bc(5),  code: '5 - MUROS',            name: 'Muros' } },
    { id: 'tx04', project_id: P1, date: '2026-02-06', budget_category_id: bc(4),  description: 'HORMIGON PREMEZCLADO 210 KG/CM2', supplier_id: sp4,  quantity: 18,  unit_price: 7500,    total: 135000,  payment_condition: 'Pago Cheque',         invoice_number: 'HN-1122', check_number: '001245', bank: 'Banco Santa Cruz',          cashed_date: null,         payroll_period_id: null, notes: '18 metros cúbicos',                 created_at: '2026-02-06T10:00:00Z', supplier: spRef(sp4, 'Hormigones Nacionales'), budget_category: { id: bc(4),  code: '4 - H.A.',             name: 'Hormigón armado' } },
    { id: 'tx05', project_id: P1, date: '2026-02-07', budget_category_id: bc(3),  description: 'VARILLAS 3/8 Y 1/2 - 120 QQ',    supplier_id: sp5,  quantity: 120, unit_price: 750,     total: 90000,   payment_condition: 'Credito por Factura', invoice_number: 'AC-8890', check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-02-07T10:00:00Z', supplier: spRef(sp5, 'Acero del Cibao'),       budget_category: { id: bc(3),  code: '3 - ESTRUCTURA',       name: 'Estructura' } },
    { id: 'tx06', project_id: P1, date: '2026-02-10', budget_category_id: bc(8),  description: 'TUBERIA PVC 4" Y ACCESORIOS',     supplier_id: sp2,  quantity: 1,   unit_price: 45600,   total: 45600,   payment_condition: 'Pago Cash',           invoice_number: 'FO-2233', check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-02-10T10:00:00Z', supplier: spRef(sp2, 'Ferretería Ochoa'),      budget_category: { id: bc(8),  code: '8 - PLOMERIA',         name: 'Plomería' } },
    { id: 'tx07', project_id: P1, date: '2026-02-12', budget_category_id: bc(13), description: 'MATERIAL ELECTRICO PLANTA BAJA',  supplier_id: sp3,  quantity: 1,   unit_price: 88070,   total: 88070,   payment_condition: 'Credito por TC',      invoice_number: 'FP-5544', check_number: null,    bank: 'Banco BHD León',            cashed_date: null,         payroll_period_id: null, notes: 'Cables, breakers, tubería conduit', created_at: '2026-02-12T10:00:00Z', supplier: spRef(sp3, 'Ferretería Pappaterra'), budget_category: { id: bc(13), code: '13 - INST. ELECTRICA',  name: 'Instalación eléctrica' } },
    { id: 'tx08', project_id: P1, date: '2026-02-15', budget_category_id: bc(23), description: 'PAGO DIRECCION TECNICA FEBRERO',  supplier_id: null, quantity: 1,   unit_price: 69750,   total: 69750,   payment_condition: 'Pago Transferencia',  invoice_number: null,      check_number: null,    bank: 'Banco Popular Dominicano',  cashed_date: '2026-02-15', payroll_period_id: null, notes: 'DT 10% sobre RD$697,500',           created_at: '2026-02-15T10:00:00Z', supplier: null,            budget_category: { id: bc(23), code: '23 - GASTOS INDIRECTOS', name: 'Gastos indirectos' } },
    { id: 'tx09', project_id: P1, date: '2026-02-20', budget_category_id: bc(10), description: 'CERAMICA PISO 60X60 BEIGE',       supplier_id: sp2,  quantity: 85,  unit_price: 1850,    total: 157250,  payment_condition: 'Credito por Factura', invoice_number: 'FO-2301', check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: '85 m2 para planta baja',            created_at: '2026-02-20T10:00:00Z', supplier: spRef(sp2, 'Ferretería Ochoa'),      budget_category: { id: bc(10), code: '10 - PISOS',            name: 'Pisos' } },
    { id: 'tx10', project_id: P1, date: '2026-03-01', budget_category_id: bc(7),  description: 'PLAFON SHEETROCK Y PERFILERIA',   supplier_id: sp1,  quantity: 1,   unit_price: 57300,   total: 57300,   payment_condition: 'Pago Cheque',         invoice_number: 'FB-4602', check_number: '001248', bank: 'Banco Santa Cruz',          cashed_date: '2026-03-05', payroll_period_id: null, notes: null,                                created_at: '2026-03-01T10:00:00Z', supplier: spRef(sp1, 'Ferretería Bellón'),     budget_category: { id: bc(7),  code: '7 - PLAFON',           name: 'Plafón' } },
    { id: 'tx11', project_id: P1, date: '2026-03-05', budget_category_id: bc(18), description: 'PINTURA POPULAR BLANCA 5 GAL X 8', supplier_id: sp3, quantity: 8,   unit_price: 4500,    total: 36000,   payment_condition: 'Pago Cash',           invoice_number: null,      check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-03-05T10:00:00Z', supplier: spRef(sp3, 'Ferretería Pappaterra'), budget_category: { id: bc(18), code: '18 - PINTURA',          name: 'Pintura' } },
    { id: 'tx12', project_id: P1, date: '2026-03-10', budget_category_id: bc(22), description: 'ALQUILER ANDAMIOS MES MARZO',     supplier_id: null, quantity: 1,   unit_price: 35000,   total: 35000,   payment_condition: 'Pago Cash',           invoice_number: null,      check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-03-10T10:00:00Z', supplier: null,            budget_category: { id: bc(22), code: '22 - MISCELANEOS',      name: 'Misceláneos' } },
    { id: 'tx13', project_id: P1, date: '2026-03-15', budget_category_id: bc(15), description: 'HERRERIA VENTANAS Y BALCON',      supplier_id: null, quantity: 1,   unit_price: 112430,  total: 112430,  payment_condition: 'Pago Cheque',         invoice_number: null,      check_number: '001250', bank: 'Banco Santa Cruz',          cashed_date: null,         payroll_period_id: null, notes: 'Cheque pendiente de cobro',         created_at: '2026-03-15T10:00:00Z', supplier: null,            budget_category: { id: bc(15), code: '15 - HERRERIA',         name: 'Herrería' } },
    { id: 'tx14', project_id: P1, date: '2026-03-18', budget_category_id: bc(20), description: 'MEZCLADORA DE CONCRETO ALQUILER', supplier_id: null, quantity: 1,   unit_price: 28000,   total: 28000,   payment_condition: 'Pago Cash',           invoice_number: null,      check_number: null,    bank: null,                        cashed_date: null,         payroll_period_id: null, notes: null,                                created_at: '2026-03-18T10:00:00Z', supplier: null,            budget_category: { id: bc(20), code: '20 - EQUIPAMIENTO',     name: 'Equipamiento' } },
    { id: 'tx15', project_id: P1, date: '2026-03-10', budget_category_id: bc(5),  description: 'ABONO A FACTURA FB-4521 BELLON',  supplier_id: sp1,  quantity: 1,   unit_price: 100000,  total: 100000,  payment_condition: 'Pago Transferencia',  invoice_number: 'FB-4521', check_number: null,    bank: 'Banco Santa Cruz',          cashed_date: '2026-03-10', payroll_period_id: null, notes: 'Abono parcial',                     created_at: '2026-03-10T12:00:00Z', supplier: spRef(sp1, 'Ferretería Bellón'),     budget_category: { id: bc(5),  code: '5 - MUROS',            name: 'Muros' } },
  ],

  quality_control: [
    { id: 'qc01', project_id: P1, element: 'COLUMNAS PLANTA BAJA EJE A-B', pour_date: '2026-02-05', test_date: '2026-03-05', test_age: '28 días', actual_resistance: 228, expected_resistance: 210, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Lab Técnica S.A.', status: 'passed', notes: null },
    { id: 'qc02', project_id: P1, element: 'LOSA NIVEL 1 ZONA SUR',         pour_date: '2026-02-10', test_date: '2026-03-10', test_age: '28 días', actual_resistance: 195, expected_resistance: 210, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Lab Técnica S.A.', status: 'failed', notes: 'Relación a/c alta. Revisar proceso de vaciado.' },
    { id: 'qc03', project_id: P1, element: 'VIGAS NIVEL 1 EJE 1-4',         pour_date: '2026-02-20', test_date: '2026-03-20', test_age: '28 días', actual_resistance: 215, expected_resistance: 210, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Lab Técnica S.A.', status: 'passed', notes: null },
    { id: 'qc04', project_id: P1, element: 'COLUMNAS NIVEL 2 EJE A-B',      pour_date: '2026-03-05', test_date: null,         test_age: '28 días', actual_resistance: null, expected_resistance: 210, concrete_supplier: 'Hormigones Nacionales', laboratory: 'Lab Técnica S.A.', status: null,     notes: 'Ensayo pendiente al 02/04/2026' },
    { id: 'qc05', project_id: P1, element: 'LOSA NIVEL 2',                  pour_date: '2026-03-15', test_date: null,         test_age: '28 días', actual_resistance: null, expected_resistance: 210, concrete_supplier: 'Hormigones Nacionales', laboratory: null,               status: null,     notes: null },
  ],

  budget_items: [
    { id: 'bi01', budget_category_id: bc(1),  code: '1.1',  description: 'Desmonte y limpieza del terreno',              unit: 'M2',    quantity: 350, unit_price: 85,    sort_order: 1, notes: null },
    { id: 'bi02', budget_category_id: bc(1),  code: '1.2',  description: 'Replanteo y nivelación',                       unit: 'M2',    quantity: 350, unit_price: 60,    sort_order: 2, notes: null },
    { id: 'bi03', budget_category_id: bc(1),  code: '1.3',  description: 'Construcción de caseta de obra',               unit: 'Global', quantity: 1,  unit_price: 25000, sort_order: 3, notes: null },
    { id: 'bi04', budget_category_id: bc(3),  code: '3.1',  description: 'Pilotes de hormigón armado Ø30cm',             unit: 'ML',    quantity: 80,  unit_price: 3500,  sort_order: 1, notes: null },
    { id: 'bi05', budget_category_id: bc(3),  code: '3.2',  description: 'Zapatas corridas 50x50cm',                     unit: 'M3',    quantity: 24,  unit_price: 8500,  sort_order: 2, notes: null },
    { id: 'bi06', budget_category_id: bc(3),  code: '3.3',  description: 'Columnas hormigón armado 30x30cm',             unit: 'ML',    quantity: 180, unit_price: 2800,  sort_order: 3, notes: null },
    { id: 'bi07', budget_category_id: bc(3),  code: '3.4',  description: 'Vigas de amarre 20x40cm',                      unit: 'ML',    quantity: 220, unit_price: 1800,  sort_order: 4, notes: null },
    { id: 'bi08', budget_category_id: bc(4),  code: '4.1',  description: 'Losa maciza planta baja e=15cm',               unit: 'M2',    quantity: 180, unit_price: 1400,  sort_order: 1, notes: null },
    { id: 'bi09', budget_category_id: bc(4),  code: '4.2',  description: 'Losa maciza nivel 2 e=15cm',                   unit: 'M2',    quantity: 180, unit_price: 1400,  sort_order: 2, notes: null },
    { id: 'bi10', budget_category_id: bc(5),  code: '5.1',  description: 'Muro de bloque 6" planta baja',                unit: 'M2',    quantity: 320, unit_price: 950,   sort_order: 1, notes: null },
    { id: 'bi11', budget_category_id: bc(5),  code: '5.2',  description: 'Muro de bloque 4" divisiones internas',        unit: 'M2',    quantity: 180, unit_price: 750,   sort_order: 2, notes: null },
    { id: 'bi12', budget_category_id: bc(8),  code: '8.1',  description: 'Tubería PVC sanitaria 4"',                     unit: 'ML',    quantity: 60,  unit_price: 450,   sort_order: 1, notes: null },
    { id: 'bi13', budget_category_id: bc(8),  code: '8.2',  description: 'Tubería CPVC agua fría 1/2"',                  unit: 'ML',    quantity: 120, unit_price: 280,   sort_order: 2, notes: null },
    { id: 'bi14', budget_category_id: bc(8),  code: '8.3',  description: 'Instalación de inodoros (incl. accesorios)',   unit: 'Und',   quantity: 4,   unit_price: 12500, sort_order: 3, notes: null },
    { id: 'bi15', budget_category_id: bc(10), code: '10.1', description: 'Piso cerámica 60x60 área social',              unit: 'M2',    quantity: 120, unit_price: 1850,  sort_order: 1, notes: null },
    { id: 'bi16', budget_category_id: bc(10), code: '10.2', description: 'Piso porcelanato 60x60 habitaciones',          unit: 'M2',    quantity: 90,  unit_price: 2200,  sort_order: 2, notes: null },
    { id: 'bi17', budget_category_id: bc(10), code: '10.3', description: 'Piso antideslizante 30x30 baños',              unit: 'M2',    quantity: 24,  unit_price: 1600,  sort_order: 3, notes: null },
    { id: 'bi18', budget_category_id: bc(13), code: '13.1', description: 'Cableado eléctrico calibre #12 circuitos',     unit: 'ML',    quantity: 400, unit_price: 180,   sort_order: 1, notes: null },
    { id: 'bi19', budget_category_id: bc(13), code: '13.2', description: 'Panel eléctrico 24 circuitos',                 unit: 'Und',   quantity: 1,   unit_price: 18500, sort_order: 2, notes: null },
    { id: 'bi20', budget_category_id: bc(13), code: '13.3', description: 'Instalación de puntos de luz y tomas',         unit: 'Punto', quantity: 45,  unit_price: 1200,  sort_order: 3, notes: null },
  ],

  price_list_items: [
    { id: 'pl01', project_id: P1, category: 'material',  code: 'MAT-001', description: 'Cemento Portland Cibao 42.5 kg',         unit: 'Saco', unit_price: 750 },
    { id: 'pl02', project_id: P1, category: 'material',  code: 'MAT-002', description: 'Arena de río (m3)',                       unit: 'M3',   unit_price: 2800 },
    { id: 'pl03', project_id: P1, category: 'material',  code: 'MAT-003', description: 'Grava triturada 3/4"',                    unit: 'M3',   unit_price: 3200 },
    { id: 'pl04', project_id: P1, category: 'material',  code: 'MAT-004', description: 'Varilla de acero 3/8"',                   unit: 'QQ',   unit_price: 750 },
    { id: 'pl05', project_id: P1, category: 'material',  code: 'MAT-005', description: 'Varilla de acero 1/2"',                   unit: 'QQ',   unit_price: 780 },
    { id: 'pl06', project_id: P1, category: 'material',  code: 'MAT-006', description: 'Bloque de hormigón 6"',                   unit: 'Und',  unit_price: 45 },
    { id: 'pl07', project_id: P1, category: 'material',  code: 'MAT-007', description: 'Bloque de hormigón 4"',                   unit: 'Und',  unit_price: 35 },
    { id: 'pl08', project_id: P1, category: 'material',  code: 'MAT-008', description: 'Cerámica piso 60x60 beige',               unit: 'M2',   unit_price: 1850 },
    { id: 'pl09', project_id: P1, category: 'material',  code: 'MAT-009', description: 'Tubería PVC sanitaria 4"',                unit: 'ML',   unit_price: 220 },
    { id: 'pl10', project_id: P1, category: 'material',  code: 'MAT-010', description: 'Tubería CPVC agua fría 1/2"',             unit: 'ML',   unit_price: 95 },
    { id: 'pl11', project_id: P1, category: 'labor',     code: 'LAB-001', description: 'Maestro de obras (día)',                  unit: 'Día',  unit_price: 3500 },
    { id: 'pl12', project_id: P1, category: 'labor',     code: 'LAB-002', description: 'Ayudante de construcción (día)',          unit: 'Día',  unit_price: 1800 },
    { id: 'pl13', project_id: P1, category: 'labor',     code: 'LAB-003', description: 'Plomero (día)',                           unit: 'Día',  unit_price: 3000 },
    { id: 'pl14', project_id: P1, category: 'labor',     code: 'LAB-004', description: 'Electricista (día)',                      unit: 'Día',  unit_price: 3200 },
    { id: 'pl15', project_id: P1, category: 'labor',     code: 'LAB-005', description: 'Mano de obra piso cerámico (M2)',         unit: 'M2',   unit_price: 450 },
    { id: 'pl16', project_id: P1, category: 'labor',     code: 'LAB-006', description: 'Mano de obra muro de bloque (M2)',        unit: 'M2',   unit_price: 380 },
    { id: 'pl17', project_id: P1, category: 'equipment', code: 'EQU-001', description: 'Alquiler mezcladora de concreto (día)',   unit: 'Día',  unit_price: 2500 },
    { id: 'pl18', project_id: P1, category: 'equipment', code: 'EQU-002', description: 'Alquiler andamios (mes)',                 unit: 'Mes',  unit_price: 35000 },
  ],

  contract_cubications: [
    { id: 'cu01', project_id: P1, contractor_id: ct1, specialty: 'ESTRUCTURA DE HORMIGÓN ARMADO',        original_budget: 1200000, adjusted_budget: 1250000, total_advanced: 750000, remaining: 500000,  completion_percent: 60, contractor: ctRef(ct1, 'Lucio Almonte',  'Maestro constructor') },
    { id: 'cu02', project_id: P1, contractor_id: ct2, specialty: 'PLOMERÍA E INSTALACIONES SANITARIAS',  original_budget: 350000,  adjusted_budget: 350000,  total_advanced: 140000, remaining: 210000,  completion_percent: 40, contractor: ctRef(ct2, 'Lenin Marte',   'Plomería e instalaciones') },
    { id: 'cu03', project_id: P1, contractor_id: ct3, specialty: 'INSTALACIÓN ELÉCTRICA COMPLETA',       original_budget: 280000,  adjusted_budget: 310000,  total_advanced: 93000,  remaining: 217000,  completion_percent: 30, contractor: ctRef(ct3, 'Rafael Sánchez', 'Electricidad') },
    { id: 'cu04', project_id: P1, contractor_id: ct4, specialty: 'EBANISTERÍA Y PUERTAS',                original_budget: 420000,  adjusted_budget: 420000,  total_advanced: 0,      remaining: 420000,  completion_percent: 0,  contractor: ctRef(ct4, 'Joan Pimentel',  'Ebanistería y carpintería') },
  ],

  purchase_requisitions: [
    { id: 'req001', project_id: P1, req_number: 'REQ-2026-0021', description: 'Materiales techumbre nivel 2',              requested_by: 'Mariela Rodríguez', required_date: '2026-03-15', status: 'ordered',           notes: null,                      approved_quote_id: 'qte002', approved_by: 'Roberto Peña', approved_at: '2026-03-03T14:30:00Z', signature_data: null, rejection_reason: null, revision_notes: null,                                                                                                                                payment_type: 'credit', ordered_at: '2026-03-04T09:00:00Z', created_at: '2026-03-01T09:00:00Z', updated_at: '2026-03-04T09:00:00Z', project: projRef },
    { id: 'req002', project_id: P1, req_number: 'REQ-2026-0034', description: 'Varillas y alambre para estructura nivel 3', requested_by: 'Mariela Rodríguez', required_date: '2026-03-25', status: 'pending_approval',  notes: 'Urgente, trabajo paralizado', approved_quote_id: null,      approved_by: null,           approved_at: null,                   signature_data: null, rejection_reason: null, revision_notes: null,                                                                                                                                payment_type: null,     ordered_at: null,                   created_at: '2026-03-18T11:00:00Z', updated_at: '2026-03-18T11:00:00Z', project: projRef },
  ],

  purchase_quotes: [
    { id: 'qte001', requisition_id: 'req001', supplier_id: sp1, quote_number: 'COT-2026-0112', valid_until: '2026-03-10', subtotal: 185000, tax_percent: 18, total: 218300, negotiated_total: null,   negotiated_notes: null,                          notes: null },
    { id: 'qte002', requisition_id: 'req001', supplier_id: sp2, quote_number: 'FO-COT-0445',   valid_until: '2026-03-12', subtotal: 172000, tax_percent: 18, total: 202960, negotiated_total: 196000,  negotiated_notes: 'Acordaron bajar 3.4% por volumen', notes: 'Incluye flete' },
    { id: 'qte003', requisition_id: 'req001', supplier_id: sp3, quote_number: 'FP-C-2026-33',  valid_until: '2026-03-08', subtotal: 196500, tax_percent: 18, total: 231870, negotiated_total: null,   negotiated_notes: null,                          notes: null },
    { id: 'qte004', requisition_id: 'req002', supplier_id: sp5, quote_number: 'AC-2026-089',   valid_until: '2026-03-28', subtotal: 97500,  tax_percent: 18, total: 115050, negotiated_total: null,   negotiated_notes: null,                          notes: null },
    { id: 'qte005', requisition_id: 'req002', supplier_id: sp1, quote_number: 'COT-2026-0118', valid_until: '2026-03-25', subtotal: 102000, tax_percent: 18, total: 120360, negotiated_total: null,   negotiated_notes: null,                          notes: null },
    { id: 'qte006', requisition_id: 'req002', supplier_id: sp2, quote_number: null,            valid_until: '2026-03-22', subtotal: 95000,  tax_percent: 18, total: 112100, negotiated_total: null,   negotiated_notes: null,                          notes: 'Precio sujeto a disponibilidad' },
  ],

  purchase_quote_items: [
    { id: 'qi01', quote_id: 'qte001', description: 'BLOQUE 6" ESTÁNDAR',     quantity: 500, unit: 'Unidad', unit_price: 62,  subtotal: 31000 },
    { id: 'qi02', quote_id: 'qte001', description: 'CEMENTO GRIS 94LB',      quantity: 200, unit: 'Saco',   unit_price: 770, subtotal: 154000 },
    { id: 'qi03', quote_id: 'qte002', description: 'BLOQUE 6" ESTÁNDAR',     quantity: 500, unit: 'Unidad', unit_price: 58,  subtotal: 29000 },
    { id: 'qi04', quote_id: 'qte002', description: 'CEMENTO GRIS 94LB',      quantity: 200, unit: 'Saco',   unit_price: 715, subtotal: 143000 },
    { id: 'qi05', quote_id: 'qte003', description: 'BLOQUE 6" ESTÁNDAR',     quantity: 500, unit: 'Unidad', unit_price: 65,  subtotal: 32500 },
    { id: 'qi06', quote_id: 'qte003', description: 'CEMENTO GRIS 94LB',      quantity: 200, unit: 'Saco',   unit_price: 820, subtotal: 164000 },
    { id: 'qi07', quote_id: 'qte004', description: 'VARILLA 1/2" x 40 pies', quantity: 100, unit: 'Unidad', unit_price: 850, subtotal: 85000 },
    { id: 'qi08', quote_id: 'qte004', description: 'ALAMBRE DE AMARRE 16',   quantity: 25,  unit: 'Rollo',  unit_price: 500, subtotal: 12500 },
    { id: 'qi09', quote_id: 'qte005', description: 'VARILLA 1/2" x 40 pies', quantity: 100, unit: 'Unidad', unit_price: 880, subtotal: 88000 },
    { id: 'qi10', quote_id: 'qte005', description: 'ALAMBRE DE AMARRE 16',   quantity: 25,  unit: 'Rollo',  unit_price: 560, subtotal: 14000 },
    { id: 'qi11', quote_id: 'qte006', description: 'VARILLA 1/2" x 40 pies', quantity: 100, unit: 'Unidad', unit_price: 820, subtotal: 82000 },
    { id: 'qi12', quote_id: 'qte006', description: 'ALAMBRE DE AMARRE 16',   quantity: 25,  unit: 'Rollo',  unit_price: 520, subtotal: 13000 },
  ],
}
