import { describe, expect, it } from 'vitest'
import { canEditPayrollItems } from './payrollItemPermissions'

describe('canEditPayrollItems (opción A: editor en borrador + Director siempre)', () => {
  it('borrador: el editor (edit_payroll) puede editar', () => {
    expect(canEditPayrollItems({ isDraft: true, canEditDraft: true, canEditCommitted: false })).toBe(true)
  })

  it('borrador: sin permiso de edición no puede editar', () => {
    expect(canEditPayrollItems({ isDraft: true, canEditDraft: false, canEditCommitted: false })).toBe(false)
  })

  it('comprometido (enviado/aprobado/pagado): solo mayor jerarquía (approve_payroll) puede editar', () => {
    expect(canEditPayrollItems({ isDraft: false, canEditDraft: true, canEditCommitted: true })).toBe(true)
  })

  it('comprometido: un editor que NO aprueba no puede corregir', () => {
    // Caso clave: el ingeniero puede editar el borrador, pero una vez enviado
    // el reporte ya no — debe intervenir el Director.
    expect(canEditPayrollItems({ isDraft: false, canEditDraft: true, canEditCommitted: false })).toBe(false)
  })

  it('comprometido: sin ningún permiso no puede editar', () => {
    expect(canEditPayrollItems({ isDraft: false, canEditDraft: false, canEditCommitted: false })).toBe(false)
  })

  it('borrador: la mayor jerarquía siempre puede editar', () => {
    expect(canEditPayrollItems({ isDraft: true, canEditDraft: false, canEditCommitted: true })).toBe(true)
  })
})
