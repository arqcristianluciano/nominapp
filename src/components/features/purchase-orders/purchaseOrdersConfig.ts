export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'quoting', label: 'En cotización' },
  { value: 'pending_approval', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'ordered', label: 'Ordenado' },
  { value: 'rejected', label: 'Rechazado' },
] as const
