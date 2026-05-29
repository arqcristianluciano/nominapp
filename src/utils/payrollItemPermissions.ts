// -----------------------------------------------------------------------------
// Permisos de edición de partidas de mano de obra y facturas dentro de un reporte
// -----------------------------------------------------------------------------
// Regla acordada (opción A — "editor en borrador + Director siempre"):
//
//  - Mientras el reporte está en BORRADOR, puede editar/corregir quien tiene
//    permiso de edición de la nómina (capability `edit_payroll`): el usuario
//    que está introduciendo los datos.
//  - Una vez ENVIADO / APROBADO / PAGADO, solo un usuario de mayor jerarquía
//    (Director / quien aprueba, capability `approve_payroll`) puede editar,
//    porque la edición afecta cifras ya comprometidas. Esas ediciones se
//    registran en la bitácora de aprobaciones (ver usePayroll).
//
// Borrar sigue restringido a borrador (no se expande aquí): la solicitud es
// poder CORREGIR sin tener que borrar y rehacer.
// -----------------------------------------------------------------------------

export interface PayrollItemEditPermissionInput {
  /** El reporte está en estado borrador. */
  isDraft: boolean
  /** El usuario puede editar borradores de nómina (capability `edit_payroll`). */
  canEditDraft: boolean
  /**
   * El usuario es de mayor jerarquía y puede aprobar nóminas
   * (capability `approve_payroll`): habilita corregir reportes ya comprometidos.
   */
  canEditCommitted: boolean
}

/**
 * Determina si el usuario actual puede editar las partidas/facturas de un
 * reporte dado su estado y sus capabilities. No tiene efectos secundarios.
 */
export function canEditPayrollItems({
  isDraft,
  canEditDraft,
  canEditCommitted,
}: PayrollItemEditPermissionInput): boolean {
  // La mayor jerarquía (canEditCommitted) puede editar SIEMPRE ("Director
  // siempre"); el editor de borrador solo mientras el reporte es borrador.
  if (canEditCommitted) return true
  return isDraft && canEditDraft
}

/**
 * Determina si el usuario puede devolver un reporte a BORRADOR para que el
 * autor original lo corrija. Solo la mayor jerarquía (capability
 * `approve_payroll`) y solo desde `submitted`/`approved`. Un reporte `paid`
 * NO se devuelve (los pagos ya se distribuyeron); revertirlo está fuera de
 * alcance y requeriría deshacer la distribución.
 */
export function canReturnPayrollToDraft({
  status,
  canApprove,
}: {
  status: 'draft' | 'submitted' | 'approved' | 'paid'
  canApprove: boolean
}): boolean {
  return canApprove && (status === 'submitted' || status === 'approved')
}
