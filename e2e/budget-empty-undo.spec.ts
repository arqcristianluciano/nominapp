import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Verifica el resaltado de partidas vacías y el "Deshacer" tras eliminar.
test('partidas vacías: resaltado, eliminar y deshacer', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/proyectos')

  const projectName = `DESHACER ${Date.now()}`
  await page.getByRole('button', { name: /Nuevo proyecto/i }).click()
  await page.getByPlaceholder('Ej: RESIDENCIA MARTÍNEZ').fill(projectName)
  await page.getByRole('button', { name: 'Crear proyecto' }).click()

  await page.getByText(projectName).first().click()
  await page.locator('a[href^="/proyectos/"][href$="/presupuesto"]').first().click()
  await page.waitForURL(/\/proyectos\/[^/]+\/presupuesto$/)

  // Resaltado: la etiqueta "vacía" aparece en las filas (23 partidas nuevas).
  await expect(page.getByText('vacía').first()).toBeVisible()

  // Abrir el diálogo desde la cabecera y eliminar todas.
  await page.getByRole('button', { name: /Limpiar partidas vacías \(23\)/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Eliminar partidas vacías' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /Eliminar 23 partidas/ }).click()

  // Aviso con "Deshacer" y ya no quedan partidas (no hay botón de limpieza).
  const undo = page.getByRole('button', { name: 'Deshacer' })
  await expect(undo).toBeVisible()
  await expect(page.getByRole('button', { name: /Limpiar partidas vacías/ })).toHaveCount(0)

  // Deshacer: vuelven las 23 partidas (reaparece el botón de limpieza con 23).
  await undo.click()
  await expect(page.getByRole('button', { name: /Limpiar partidas vacías \(23\)/ })).toBeVisible()
})
