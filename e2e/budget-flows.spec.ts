import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'

async function loginDemo(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Cristian' }).click()
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function openFirstProjectBudget(page: import('@playwright/test').Page) {
  await page.goto('/presupuesto')
  const link = page.locator('a[href^="/proyectos/"][href$="/presupuesto"]').first()
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/\/proyectos\/[^/]+\/presupuesto$/)
}

function buildBudgetExcel(): Buffer {
  const aoa: (string | number)[][] = [
    ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
    [1, 'PRELIMINARES', '', '', ''],
    ['1.01', 'Campamento', 'pa', 1, 1000000],
    [2, 'MOVIMIENTO DE TIERRA', '', '', ''],
    ['2.01', 'Corte y bote', 'm3', 1500, 650],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

test.describe('Importación de presupuesto desde Excel', () => {
  test('detecta capítulo existente y crea capítulo nuevo cuando no matchea', async ({ page }) => {
    await loginDemo(page)
    await openFirstProjectBudget(page)

    await page.getByRole('button', { name: 'Importar Excel' }).click()
    await expect(page.getByRole('heading', { name: 'Importar presupuesto desde Excel' })).toBeVisible()

    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]')
    await fileInput.setInputFiles({
      name: 'presupuesto-test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buildBudgetExcel(),
    })

    await expect(page.getByText('2 válidas')).toBeVisible()
    await expect(page.getByText(/Campamento/)).toBeVisible()
    await expect(page.getByText(/Corte y bote/)).toBeVisible()
    await expect(page.getByText(/partidas nuevas/i)).toBeVisible()
    await expect(page.getByText('MOVIMIENTO DE TIERRA')).toBeVisible()
  })

  test('descarga la plantilla de ejemplo', async ({ page }) => {
    await loginDemo(page)
    await openFirstProjectBudget(page)

    await page.getByRole('button', { name: 'Importar Excel' }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar plantilla' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('plantilla-presupuesto.xlsx')
  })
})

test.describe('Creación de proyectos', () => {
  test('modal de Nuevo proyecto se abre con los campos requeridos visibles', async ({ page }) => {
    await loginDemo(page)
    await page.goto('/proyectos')

    await page.getByRole('button', { name: /Nuevo proyecto/i }).click()
    await expect(page.getByRole('heading', { name: 'Nuevo proyecto' })).toBeVisible()
    await expect(page.getByPlaceholder('Ej: RESIDENCIA MARTÍNEZ')).toBeVisible()
    await expect(page.getByPlaceholder('Ej: RM-2026')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear proyecto' })).toBeVisible()
  })
})
