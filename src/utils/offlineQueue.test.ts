import { describe, it, expect, vi } from 'vitest'
import { saveOrQueue, isOnline } from './offlineQueue'

describe('isOnline', () => {
  it('devuelve true cuando navigator no existe (entorno node)', () => {
    expect(isOnline()).toBe(true)
  })
})

describe('saveOrQueue', () => {
  it('con conexión: ejecuta la operación y devuelve "saved"', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    const result = await saveOrQueue('partida_progress.add', { a: 1 }, run)
    expect(result).toBe('saved')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('propaga el error si la operación en línea falla', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(saveOrQueue('inventory_movement.add', { x: 1 }, run)).rejects.toThrow('boom')
  })
})
