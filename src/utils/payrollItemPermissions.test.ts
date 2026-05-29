import { describe, expect, it } from 'vitest'
import { canEditPayrollItems, canReturnPayrollToDraft } from './payrollItemPermissions'

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

describe('canReturnPayrollToDraft', () => {
  it('mayor jerarquía puede devolver desde enviado y desde aprobado', () => {
    expect(canReturnPayrollToDraft({ status: 'submitted', canApprove: true })).toBe(true)
    expect(canReturnPayrollToDraft({ status: 'approved', canApprove: true })).toBe(true)
  })

  it('sin permiso de aprobación nunca puede devolver', () => {
    expect(canReturnPayrollToDraft({ status: 'submitted', canApprove: false })).toBe(false)
    expect(canReturnPayrollToDraft({ status: 'approved', canApprove: false })).toBe(false)
  })

  it('un reporte pagado no se devuelve (pagos ya distribuidos)', () => {
    expect(canReturnPayrollToDraft({ status: 'paid', canApprove: true })).toBe(false)
  })

  it('un borrador no se "devuelve" (ya es borrador)', () => {
    expect(canReturnPayrollToDraft({ status: 'draft', canApprove: true })).toBe(false)
  })
})
