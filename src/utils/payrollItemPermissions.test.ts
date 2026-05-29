import { describe, expect, it } from 'vitest'
import { canEditPayrollItems, isDataEntryStage, DATA_ENTRY_PAYROLL_STATUSES } from './payrollItemPermissions'
import type { PayrollStatus } from '@/types/database'

describe('isDataEntryStage', () => {
  it('borrador y enviado siguen en la etapa de introducción de datos', () => {
    expect(isDataEntryStage('draft')).toBe(true)
    expect(isDataEntryStage('submitted')).toBe(true)
  })

  it('aprobado y pagado ya salieron de la etapa de introducción de datos', () => {
    expect(isDataEntryStage('approved')).toBe(false)
    expect(isDataEntryStage('paid')).toBe(false)
  })

  it('DATA_ENTRY_PAYROLL_STATUSES es exactamente draft y submitted', () => {
    expect(DATA_ENTRY_PAYROLL_STATUSES).toEqual(['draft', 'submitted'])
  })
})

describe('canEditPayrollItems (editable hasta aprobar; autorizado siempre)', () => {
  it('borrador: quien captura los datos (edit_payroll) puede editar', () => {
    expect(canEditPayrollItems({ status: 'draft', canEditDraft: true, canEditCommitted: false })).toBe(true)
  })

  it('enviado: quien captura los datos sigue pudiendo corregir (aún no aprobado)', () => {
    // Caso clave de la solicitud: un reporte enviado pero no aprobado debe poder
    // corregirlo quien lo capturó, sin tener que borrarlo y rehacerlo.
    expect(canEditPayrollItems({ status: 'submitted', canEditDraft: true, canEditCommitted: false })).toBe(true)
  })

  it('aprobado/pagado: quien solo captura datos ya NO puede editar', () => {
    expect(canEditPayrollItems({ status: 'approved', canEditDraft: true, canEditCommitted: false })).toBe(false)
    expect(canEditPayrollItems({ status: 'paid', canEditDraft: true, canEditCommitted: false })).toBe(false)
  })

  it('sin permiso de edición no puede editar ni en borrador', () => {
    expect(canEditPayrollItems({ status: 'draft', canEditDraft: false, canEditCommitted: false })).toBe(false)
  })

  it('la mayor jerarquía (approve_payroll) puede editar en cualquier estado', () => {
    const statuses: PayrollStatus[] = ['draft', 'submitted', 'approved', 'paid']
    for (const status of statuses) {
      expect(canEditPayrollItems({ status, canEditDraft: false, canEditCommitted: true })).toBe(true)
    }
  })
})
