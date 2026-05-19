import { describe, expect, it } from 'vitest'
import { materialsCatalogService } from './materialsCatalogService'

describe('materialsCatalogService', () => {
  it('crea material con código auto-generado si no se especifica', async () => {
    const item = await materialsCatalogService.create({
      description: 'Cemento Portland gris',
      unit: 'sacos',
    })
    expect(item.code).toMatch(/^MAT-\d{4}$/)
    expect(item.description).toBe('Cemento Portland gris')
    expect(item.is_active).toBe(true)
  })

  it('respeta código manual cuando se pasa', async () => {
    const item = await materialsCatalogService.create({
      code: 'CUSTOM-001',
      description: 'Test',
      unit: 'unid',
    })
    expect(item.code).toBe('CUSTOM-001')
  })

  it('setActive cambia is_active', async () => {
    const item = await materialsCatalogService.create({ description: 'X', unit: 'unid' })
    await materialsCatalogService.setActive(item.id, false)
    const reloaded = await materialsCatalogService.getById(item.id)
    expect(reloaded?.is_active).toBe(false)
  })
})
