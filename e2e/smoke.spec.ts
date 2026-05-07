import { expect, test } from '@playwright/test'

async function loginDemo(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Cristian' }).click()
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function openFirstProjectBudget(page: import('@playwright/test').Page) {
  await page.goto('/presupuesto')
  await expect(page).toHaveURL(/\/presupuesto$/)
  const projectBudgetLink = page.locator('a[href^="/proyectos/"][href$="/presupuesto"]').first()
  await expect(projectBudgetLink).toBeVisible()
  await projectBudgetLink.click()
  await expect(page).toHaveURL(/\/proyectos\/[^/]+\/presupuesto$/)
}

test('exportar excel desde Reportes', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/reportes')
  await expect(page.getByRole('heading', { name: 'Resumen Financiero' })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar Excel' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toContain('resumen-financiero-')
  expect(download.suggestedFilename()).toContain('.xlsx')
})

test('abrir modal de importar presupuesto excel', async ({ page }) => {
  await loginDemo(page)
  await openFirstProjectBudget(page)

  await page.getByRole('button', { name: 'Importar Excel' }).click()
  await expect(page.getByRole('heading', { name: 'Importar presupuesto desde Excel' })).toBeVisible()
  await expect(page.getByText(/seleccionar \(\.xlsx, \.xls\)/i)).toBeVisible()
})

test('mostrar carga de mercado excel en Insumos', async ({ page }) => {
  await loginDemo(page)
  await openFirstProjectBudget(page)
  await page.getByRole('link', { name: 'Insumos' }).click()
  await expect(page).toHaveURL(/\/proyectos\/[^/]+\/insumos$/)

  await expect(page.getByRole('heading', { name: 'Importar presupuesto Mercado' })).toBeVisible()
  await expect(page.getByText(/seleccionar \(\.xlsx, \.xls\)/i)).toBeVisible()
})
