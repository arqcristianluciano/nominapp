import { describe, expect, it } from 'vitest'
import { budgetVersionService } from './budgetVersionService'

const projectId = `p_bv_${Date.now()}`

describe('budgetVersionService', () => {
  it('snapshot exige motivo no vacío', async () => {
    await expect(budgetVersionService.snapshot(projectId, '  ', 'cristian')).rejects.toThrow(
      /Motivo obligatorio/,
    )
  })

  it('snapshot crea versión 1 y luego 2', async () => {
    const v1 = await budgetVersionService.snapshot(projectId, 'Ajuste por cliente', 'cristian')
    expect(v1.version).toBe(1)
    expect(v1.motivo).toBe('Ajuste por cliente')

    const v2 = await budgetVersionService.snapshot(projectId, 'Cambio de alcance', 'cristian')
    expect(v2.version).toBe(2)
  })

  it('listByProject retorna en orden descendente', async () => {
    const list = await budgetVersionService.listByProject(projectId)
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].version).toBeGreaterThanOrEqual(list[1].version)
  })
})
