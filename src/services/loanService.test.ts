import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// El mock expone supabase.from(...).select(...).in(...) como cadena thenable.
const fromMock = vi.fn()
const selectMock = vi.fn()
const inMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { calcInstallmentAmount, calcInstallmentDate, loanService } from './loanService'

/** Helper: arma la cadena from→select→in resolviendo a {data, error}. */
function mockSupabaseInResponse(data: Array<{ loan_id: string; amount: number }> | null, error: unknown = null) {
  inMock.mockResolvedValueOnce({ data, error })
  selectMock.mockReturnValueOnce({ in: inMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
}

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  inMock.mockReset()
})

describe('loanService.getTotalPaidByLoans', () => {
  it('con lista vacía retorna {} y NO toca supabase', async () => {
    const result = await loanService.getTotalPaidByLoans([])
    expect(result).toEqual({})
    expect(fromMock).not.toHaveBeenCalled()
    expect(selectMock).not.toHaveBeenCalled()
    expect(inMock).not.toHaveBeenCalled()
  })

  it("agrupa deducciones por loan_id sumando amounts (['l1','l2'])", async () => {
    mockSupabaseInResponse([
      { loan_id: 'l1', amount: 100 },
      { loan_id: 'l1', amount: 50.5 },
      { loan_id: 'l2', amount: 200 },
    ])

    const result = await loanService.getTotalPaidByLoans(['l1', 'l2'])

    expect(fromMock).toHaveBeenCalledWith('loan_deductions')
    expect(selectMock).toHaveBeenCalledWith('loan_id, amount')
    expect(inMock).toHaveBeenCalledWith('loan_id', ['l1', 'l2'])
    expect(result).toEqual({ l1: 150.5, l2: 200 })
  })

  it('ids sin deducciones NO aparecen en el record (caller debe usar ?? 0)', async () => {
    // l3 no tiene deducciones; sólo viene l1.
    mockSupabaseInResponse([{ loan_id: 'l1', amount: 75 }])

    const result = await loanService.getTotalPaidByLoans(['l1', 'l3'])

    expect(result).toEqual({ l1: 75 })
    // Verificamos explícitamente que l3 resuelve a 0 al consultarlo como faltante.
    expect(result['l3'] ?? 0).toBe(0)
    expect(result['l3']).toBeUndefined()
  })

  it('si data viene null (sin filas) retorna {} sin romper', async () => {
    mockSupabaseInResponse(null)

    const result = await loanService.getTotalPaidByLoans(['lX'])

    expect(result).toEqual({})
    expect(inMock).toHaveBeenCalledWith('loan_id', ['lX'])
  })

  it('propaga el error de supabase si error !== null', async () => {
    mockSupabaseInResponse(null, { message: 'boom' })

    await expect(loanService.getTotalPaidByLoans(['l1'])).rejects.toEqual({ message: 'boom' })
  })
})

describe('calcInstallmentAmount', () => {
  it('caso feliz: 1.000.000 al 10% en 10 cuotas = 110.000', () => {
    // total = 1.000.000 + 100.000 = 1.100.000 / 10 = 110.000
    expect(calcInstallmentAmount(1_000_000, 10, 10)).toBe(110_000)
  })

  it('interés 0% reparte sólo el capital', () => {
    expect(calcInstallmentAmount(500_000, 0, 5)).toBe(100_000)
  })

  it('1 sola cuota incluye todo capital + interés', () => {
    expect(calcInstallmentAmount(200_000, 5, 1)).toBe(210_000)
  })

  it('redondea a 2 decimales (banker rounding)', () => {
    // 100 + 10% = 110 / 3 = 36.6666... -> 36.67
    expect(calcInstallmentAmount(100, 10, 3)).toBe(36.67)
  })

  it('borde: installments = 0 retorna 0 (evita división por cero)', () => {
    expect(calcInstallmentAmount(1_000_000, 10, 0)).toBe(0)
  })

  it('borde: installments negativo retorna 0', () => {
    expect(calcInstallmentAmount(1_000_000, 10, -3)).toBe(0)
  })

  it('borde: principal 0 retorna 0', () => {
    expect(calcInstallmentAmount(0, 10, 12)).toBe(0)
  })
})

describe('calcInstallmentDate', () => {
  it('sin fecha de primera cuota: cada cuota quincenal cae 15 días después', () => {
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 1)).toBe('2026-06-25')
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 2)).toBe('2026-07-10')
  })

  it('sin fecha de primera cuota: semanal suma 7 días por cuota', () => {
    expect(calcInstallmentDate('2026-06-10', 'semanal', 2)).toBe('2026-06-24')
  })

  it('sin fecha de primera cuota: mensual suma meses exactos', () => {
    expect(calcInstallmentDate('2026-01-31', 'mensual', 1)).toBe('2026-03-03') // feb no tiene 31 → corre al siguiente
    expect(calcInstallmentDate('2026-06-10', 'mensual', 3)).toBe('2026-09-10')
  })

  it('con fecha de primera cuota: la cuota 1 cae exactamente en esa fecha', () => {
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 1, '2026-07-01')).toBe('2026-07-01')
    expect(calcInstallmentDate('2026-06-10', 'mensual', 1, '2026-08-15')).toBe('2026-08-15')
  })

  it('con fecha de primera cuota: las siguientes se calculan desde ahí', () => {
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 2, '2026-07-01')).toBe('2026-07-16')
    expect(calcInstallmentDate('2026-06-10', 'semanal', 3, '2026-07-01')).toBe('2026-07-15')
    expect(calcInstallmentDate('2026-06-10', 'mensual', 3, '2026-07-15')).toBe('2026-09-15')
  })

  it('fecha de primera cuota null o vacía equivale a no indicarla', () => {
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 1, null)).toBe('2026-06-25')
    expect(calcInstallmentDate('2026-06-10', 'quincenal', 1, '')).toBe('2026-06-25')
  })
})
