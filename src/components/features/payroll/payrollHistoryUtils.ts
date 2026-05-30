// Helpers puros para la sección "Historial de cambios" del reporte de nómina.

// Etiquetas de las acciones relevantes para un reporte de nómina. Subconjunto
// local del mapa de AprobacionesPage, para mantener la sección desacoplada.
export const PAYROLL_ACTION_LABEL: Record<string, string> = {
  create: 'Creado',
  submit_for_approval: 'Enviado para aprobación',
  approve: 'Aprobado',
  reject: 'Rechazado',
  return_for_revision: 'Devuelto a borrador',
  status_change: 'Cambio de estado',
  update: 'Edición de partida/factura',
  update_indirects: 'Indirectos actualizados',
  delete: 'Eliminado',
}

/** Detalle legible de una edición de ítem (acción `update`), según metadata.kind. */
export function describeItemEdit(metadata: unknown): string | null {
  const kind = (metadata as { kind?: string } | null)?.kind
  if (kind === 'labor_item') return 'partida de mano de obra'
  if (kind === 'material_invoice') return 'factura de materiales'
  return null
}
