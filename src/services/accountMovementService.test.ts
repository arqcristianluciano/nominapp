import { describe, expect, it } from 'vitest'
import { accountMovementService } from './accountMovementService'
import type { AccountMovement } from '@/types/database'

// Tests unitarios para la lógica pura (sin BD): calcSaldo
describe('accountMovementService.calcSaldo', () => {
  it('con lista vacía retorna saldo 0', () => {
    const result = accountMovementService.calcSaldo([])
    expect(result).toEqual({ totalCreditos: 0, totalDebitos: 0, saldo: 0 })
  })

  it('solo créditos: saldo positivo', () => {
    const movements: AccountMovement[] = [mockMovement('credito', 100_000), mockMovement('credito', 50_000)]
    const result = accountMovementService.calcSaldo(movements)
    expect(result.totalCreditos).toBe(150_000)
    expect(result.totalDebitos).toBe(0)
    expect(result.saldo).toBe(150_000)
  })

  it('solo débitos: saldo negativo', () => {
    const movements: AccountMovement[] = [mockMovement('debito', 200_000)]
    const result = accountMovementService.calcSaldo(movements)
    expect(result.totalCreditos).toBe(0)
    expect(result.totalDebitos).toBe(200_000)
    expect(result.saldo).toBe(-200_000)
  })

  it('mezcla créditos y débitos: saldo correcto', () => {
    const movements: AccountMovement[] = [
      mockMovement('debito', 500_000), // desembolso
      mockMovement('credito', 110_000), // cuota 1
      mockMovement('credito', 110_000), // cuota 2
    ]
    const result = accountMovementService.calcSaldo(movements)
    expect(result.totalCreditos).toBe(220_000)
    expect(result.totalDebitos).toBe(500_000)
    expect(result.saldo).toBe(-280_000)
  })

  it('créditos y débitos que se anulan: saldo 0', () => {
    const movements: AccountMovement[] = [mockMovement('debito', 100), mockMovement('credito', 100)]
    const result = accountMovementService.calcSaldo(movements)
    expect(result.saldo).toBe(0)
  })
})

// Helper para crear un AccountMovement mínimo para tests
function mockMovement(tipo: 'debito' | 'credito', monto: number): AccountMovement {
  return {
    id: crypto.randomUUID(),
    account_id: 'acc-test',
    fecha: '2026-06-01',
    tipo,
    monto,
    concepto: 'test',
    origen: 'manual',
    referencia_id: null,
    created_at: new Date().toISOString(),
  }
}
