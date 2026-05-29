import type { PayrollStatus } from '@/types/database'

// -----------------------------------------------------------------------------
// Permisos de edición de partidas de mano de obra y facturas dentro de un reporte
// -----------------------------------------------------------------------------
// Regla por etapas:
//
//  - ETAPA DE INTRODUCCIÓN DE DATOS (borrador o enviado, es decir mientras el
//    reporte NO esté aprobado): puede editar/corregir quien introduce los datos
//    (capability `edit_payroll`). Permite enmendar un reporte ya enviado para
//    aprobación sin tener que borrarlo y rehacerlo.
//  - Una vez APROBADO / PAGADO: solo un usuario de mayor jerarquía
//    (capability `approve_payroll`) puede editar, porque la edición afecta
//    cifras ya comprometidas. Esas ediciones quedan registradas en la bitácora
//    de aprobaciones (ver usePayroll).
//
// La mayor jerarquía (`approve_payroll`) puede editar en cualquier estado.
// -----------------------------------------------------------------------------

// Estados en los que el reporte sigue en la etapa de introducción de datos
// (aún no aprobado): quien captura los datos puede seguir editándolo.
export const DATA_ENTRY_PAYROLL_STATUSES: PayrollStatus[] = ['draft', 'submitted']

/** El reporte aún no fue aprobado, así que sigue en la etapa de captura. */
export function isDataEntryStage(status: PayrollStatus): boolean {
  return DATA_ENTRY_PAYROLL_STATUSES.includes(status)
}

export interface PayrollItemEditPermissionInput {
  /** Estado actual del reporte. */
  status: PayrollStatus
  /** El usuario puede editar nóminas durante la captura (capability `edit_payroll`). */
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
  status,
  canEditDraft,
  canEditCommitted,
}: PayrollItemEditPermissionInput): boolean {
  // La mayor jerarquía puede editar SIEMPRE; quien captura los datos solo
  // mientras el reporte no esté aprobado.
  if (canEditCommitted) return true
  return isDataEntryStage(status) && canEditDraft
}
