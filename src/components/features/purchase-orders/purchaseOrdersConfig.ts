export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pendiente_validacion', label: 'Pendiente validación' },
  { value: 'quoting', label: 'En cotización' },
  { value: 'pending_approval', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'ordered', label: 'Ordenado' },
  { value: 'received', label: 'Recibido' },
  { value: 'rejected', label: 'Rechazado' },
] as const
