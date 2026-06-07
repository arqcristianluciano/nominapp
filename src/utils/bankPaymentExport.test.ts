import { describe, it, expect } from 'vitest'
import { buildBankPaymentSheet, BANK_PAYMENT_HEADERS } from './bankPaymentExport'
import type { PaymentDistribution } from '@/types/database'

function makeDist(over: Partial<PaymentDistribution> = {}): PaymentDistribution {
  return {
    id: 'd1',
    payroll_period_id: 'p1',
    bank_account_id: null,
    amount: 1000,
    payment_method: 'transfer',
    beneficiary: 'Juan Pérez',
    beneficiary_type: 'contractor',
    beneficiary_id: 'c1',
    bank_name: 'Popular',
    bank_account: '123',
    beneficiary_doc: '001-1234567-8',
    check_number: null,
    status: 'pending',
    instructions: null,
    completed_at: null,
    ...over,
  }
}

describe('buildBankPaymentSheet', () => {
  it('genera una fila por pago con etiquetas en español y monto numérico', () => {
    const rows = buildBankPaymentSheet([makeDist()])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      Beneficiario: 'Juan Pérez',
      'Cédula/RNC': '001-1234567-8',
      Banco: 'Popular',
      Cuenta: '123',
      Monto: 1000,
      Método: 'Transferencia',
      'No. Cheque': '',
      'Cuenta origen': '',
      Estado: 'Pendiente',
    })
    // El monto va como número real (no texto), para que Excel lo sume.
    expect(typeof rows[0].Monto).toBe('number')
  })

  it('las claves de cada fila coinciden con el orden de columnas declarado', () => {
    const rows = buildBankPaymentSheet([makeDist()])
    expect(Object.keys(rows[0])).toEqual([...BANK_PAYMENT_HEADERS])
  })

  it('resuelve la cuenta de origen, el método cheque y el estado completado', () => {
    const rows = buildBankPaymentSheet(
      [makeDist({ bank_account_id: 'acc1', payment_method: 'check', check_number: '0042', status: 'completed' })],
      (id) => (id === 'acc1' ? 'Banreservas — 999' : undefined),
    )
    expect(rows[0]).toMatchObject({
      Método: 'Cheque',
      'No. Cheque': '0042',
      'Cuenta origen': 'Banreservas — 999',
      Estado: 'Completado',
    })
  })

  it('normaliza nulos a cadena vacía y deja origen vacío si no resuelve', () => {
    const rows = buildBankPaymentSheet(
      [
        makeDist({
          beneficiary: null,
          beneficiary_doc: null,
          bank_name: null,
          bank_account: null,
          bank_account_id: 'x',
        }),
      ],
      () => undefined,
    )
    expect(rows[0]).toMatchObject({
      Beneficiario: '',
      'Cédula/RNC': '',
      Banco: '',
      Cuenta: '',
      'Cuenta origen': '',
    })
  })
})
