import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Cobertura del editor de nómina: edición de partidas (recalcula totales) y el
// flujo crear → enviar → devolver a borrador. Modo demo (mockSupabase).

const PAID_REPORT = 'pp000000-0000-0000-0000-000000000001' // Capullo, status=paid, con items

async function readTotal(page: import('@playwright/test').Page, label: string): Promise<number> {
  const amount = page.getByText(label, { exact: true }).locator('xpath=following-sibling::span[1]')
  const txt = (await amount.first().textContent()) ?? ''
  return Number(txt.replace(/[^0-9.-]/g, ''))
}

test('reporte comprometido: editar una partida recalcula el total (y no se puede borrar)', async ({ page }) => {
  await loginDemo(page)
  await page.goto(`/nominas/${PAID_REPORT}`)
  await expect(page.getByRole('heading', { name: /Reporte No\./ })).toBeVisible()

  // En un reporte pagado, la mayor jerarquía ve "Editar" pero NO "Eliminar".
  await expect(page.getByRole('button', { name: 'Editar partida' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eliminar partida' })).toHaveCount(0)

  const before = await readTotal(page, 'Total mano de obra')
  await page.getByRole('button', { name: 'Editar partida' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Editar partida de mano de obra')).toBeVisible()
  await dialog.locator('input[inputmode="decimal"]').first().fill('9999')
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Editar partida de mano de obra')).toHaveCount(0)

  const after = await readTotal(page, 'Total mano de obra')
  expect(after).not.toBe(before)
})

test('flujo crear borrador → enviar → devolver a borrador', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/nominas')
  await page.getByRole('button', { name: 'Nuevo reporte' }).first().click()

  const createDialog = page.getByRole('dialog')
  await expect(createDialog).toBeVisible()
  await createDialog.getByRole('combobox').first().selectOption({ label: 'RESIDENCIAL CAPULLO' })
  await createDialog.getByRole('button', { name: 'Crear reporte' }).click()
  await expect(page).toHaveURL(/\/nominas\/[^/]+$/)

  // Agregar una partida (requisito para poder enviar el reporte).
  await page.getByRole('button', { name: 'Agregar partida' }).click()
  const addDialog = page.getByRole('dialog')
  await expect(addDialog.getByText('Agregar partida de mano de obra')).toBeVisible()
  await addDialog.getByRole('combobox').nth(0).selectOption({ index: 1 }) // contratista
  await addDialog.getByRole('combobox').nth(1).selectOption({ index: 1 }) // tarea (rellena precio/unidad)
  await addDialog.locator('input[inputmode="decimal"]').first().fill('5')
  await addDialog.getByRole('button', { name: 'Agregar partida' }).click()
  await expect(page.getByText('Agregar partida de mano de obra')).toHaveCount(0)

  // Enviar para aprobación. Como aún no se ha distribuido ningún pago, aparece
  // el aviso (no bloqueante) "Aún falta distribuir": se confirma con "Enviar de
  // todos modos". Luego aparece "Devolver a borrador" (estado enviado + aprobador).
  await page.getByRole('button', { name: 'Enviar para aprobación' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar de todos modos' }).click()
  await expect(page.getByRole('button', { name: 'Devolver a borrador' }).first()).toBeVisible()

  // Devolver a borrador (botón → modal de confirmación).
  await page.getByRole('button', { name: 'Devolver a borrador' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Devolver a borrador' }).click()

  // De vuelta en borrador: reaparece "Agregar partida" y desaparece "Devolver a borrador".
  await expect(page.getByRole('button', { name: 'Agregar partida' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Devolver a borrador' })).toHaveCount(0)
})
