import { describe, it, expect } from 'vitest'
import { buildBankPaymentRows, BANK_PAYMENT_HEADERS } from './bankPaymentExport'
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

describe('buildBankPaymentRows', () => {
  it('incluye encabezado y una fila por distribución con etiquetas en español', () => {
    const rows = buildBankPaymentRows([makeDist()])
    expect(rows[0]).toEqual([...BANK_PAYMENT_HEADERS])
    expect(rows[1]).toEqual([
      'Juan Pérez',
      '001-1234567-8',
      'Popular',
      '123',
      '1000.00',
      'Transferencia',
      '',
      '',
      'Pendiente',
    ])
  })

  it('resuelve la cuenta de origen, el método cheque y el estado completado', () => {
    const rows = buildBankPaymentRows(
      [makeDist({ bank_account_id: 'acc1', payment_method: 'check', check_number: '0042', status: 'completed' })],
      (id) => (id === 'acc1' ? 'Banreservas — 999' : undefined),
    )
    expect(rows[1]).toEqual([
      'Juan Pérez',
      '001-1234567-8',
      'Popular',
      '123',
      '1000.00',
      'Cheque',
      '0042',
      'Banreservas — 999',
      'Completado',
    ])
  })

  it('normaliza nulos a cadena vacía y deja origen vacío si no resuelve', () => {
    const rows = buildBankPaymentRows(
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
    expect(rows[1]).toEqual(['', '', '', '', '1000.00', 'Transferencia', '', '', 'Pendiente'])
  })
})
