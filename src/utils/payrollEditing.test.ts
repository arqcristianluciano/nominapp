import { describe, expect, it } from 'vitest'
import { canEditPayrollPeriod, isDataEntryStage, DATA_ENTRY_PAYROLL_STATUSES } from './payrollEditing'
import type { PayrollStatus } from '@/types/database'

const dataEntryUser = { canEnterData: true, isAuthorized: false }
const authorizedUser = { canEnterData: false, isAuthorized: true }
const viewerUser = { canEnterData: false, isAuthorized: false }

describe('isDataEntryStage', () => {
  it('draft y submitted están en la etapa de introducción de datos', () => {
    expect(isDataEntryStage('draft')).toBe(true)
    expect(isDataEntryStage('submitted')).toBe(true)
  })

  it('approved y paid ya no están en la etapa de introducción de datos', () => {
    expect(isDataEntryStage('approved')).toBe(false)
    expect(isDataEntryStage('paid')).toBe(false)
  })

  it('DATA_ENTRY_PAYROLL_STATUSES contiene exactamente draft y submitted', () => {
    expect(DATA_ENTRY_PAYROLL_STATUSES).toEqual(['draft', 'submitted'])
  })
})

describe('canEditPayrollPeriod', () => {
  it('quien captura datos puede editar mientras el reporte no esté aprobado', () => {
    expect(canEditPayrollPeriod('draft', dataEntryUser)).toBe(true)
    expect(canEditPayrollPeriod('submitted', dataEntryUser)).toBe(true)
  })

  it('quien captura datos NO puede editar tras la aprobación', () => {
    expect(canEditPayrollPeriod('approved', dataEntryUser)).toBe(false)
    expect(canEditPayrollPeriod('paid', dataEntryUser)).toBe(false)
  })

  it('el usuario autorizado puede editar en cualquier estado', () => {
    const statuses: PayrollStatus[] = ['draft', 'submitted', 'approved', 'paid']
    for (const status of statuses) {
      expect(canEditPayrollPeriod(status, authorizedUser)).toBe(true)
    }
  })

  it('un usuario sin permisos no puede editar en ningún estado', () => {
    const statuses: PayrollStatus[] = ['draft', 'submitted', 'approved', 'paid']
    for (const status of statuses) {
      expect(canEditPayrollPeriod(status, viewerUser)).toBe(false)
    }
  })

  it('un usuario con ambos permisos puede editar en cualquier estado', () => {
    const both = { canEnterData: true, isAuthorized: true }
    const statuses: PayrollStatus[] = ['draft', 'submitted', 'approved', 'paid']
    for (const status of statuses) {
      expect(canEditPayrollPeriod(status, both)).toBe(true)
    }
  })
})
