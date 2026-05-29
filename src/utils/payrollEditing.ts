import type { PayrollStatus } from '@/types/database'

// Etapa de "introducción de datos": el reporte aún no fue aprobado y quien
// captura los datos puede seguir editándolo. Una vez aprobado, el reporte sale
// de esta etapa y solo los usuarios autorizados pueden editarlo.
export const DATA_ENTRY_PAYROLL_STATUSES: PayrollStatus[] = ['draft', 'submitted']

export interface PayrollEditPermissions {
  /** Usuario que introduce los datos del reporte (capability `edit_payroll`). */
  canEnterData: boolean
  /** Usuario autorizado que puede editar tras la aprobación (capability `approve_payroll`). */
  isAuthorized: boolean
}

/** Indica si el estado del reporte corresponde a la etapa de introducción de datos. */
export function isDataEntryStage(status: PayrollStatus): boolean {
  return DATA_ENTRY_PAYROLL_STATUSES.includes(status)
}

/**
 * Determina si el usuario puede editar el reporte de nómina en su estado actual.
 *
 * - Etapa de introducción de datos (`draft`, `submitted`): edita quien captura
 *   los datos (`canEnterData`) y también un usuario autorizado (`isAuthorized`).
 * - Tras la aprobación (`approved`, `paid`): solo usuarios autorizados
 *   (`isAuthorized`).
 */
export function canEditPayrollPeriod(
  status: PayrollStatus,
  { canEnterData, isAuthorized }: PayrollEditPermissions,
): boolean {
  return isDataEntryStage(status) ? canEnterData || isAuthorized : isAuthorized
}
