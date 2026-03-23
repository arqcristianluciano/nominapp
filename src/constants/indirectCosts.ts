export const INDIRECT_COST_TYPES = [
  { type: 'direction_technique', label: 'Dirección técnica', defaultPercent: 10 },
  { type: 'administration', label: 'Administración', defaultPercent: 1 },
  { type: 'transport', label: 'Transporte', defaultPercent: 0.5 },
  { type: 'planning', label: 'Planificación de proyecto', defaultPercent: 0, isFixed: true },
  { type: 'electrical_supervision', label: 'Supervisión eléctrica', defaultPercent: 0, isFixed: true },
] as const

export const BANK_COMMISSION_PERCENT = 0.15

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'deposit', label: 'Depósito' },
] as const

export const PAYMENT_CONDITIONS = [
  { value: 'Credito por Factura', label: 'Crédito por factura' },
  { value: 'Credito por TC', label: 'Crédito por tarjeta' },
  { value: 'Pago Cash', label: 'Pago en efectivo' },
  { value: 'Pago Cheque', label: 'Pago con cheque' },
  { value: 'Pago Transferencia', label: 'Pago por transferencia' },
] as const

export const PAYROLL_STATUSES = [
  { value: 'draft', label: 'Borrador', color: 'gray' },
  { value: 'submitted', label: 'Enviada', color: 'blue' },
  { value: 'approved', label: 'Aprobada', color: 'green' },
  { value: 'paid', label: 'Pagada', color: 'emerald' },
] as const
