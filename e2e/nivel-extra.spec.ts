import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

test('página de aprobaciones renderiza el inbox', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/aprobaciones')
  await expect(page.getByRole('heading', { name: /Aprobaciones y auditoría/i })).toBeVisible()
  await expect(page.getByText(/Solo mis aprobaciones/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible()
})

test('captura de avance de partida desde la página de avances', async ({ page }) => {
  await loginDemo(page)
  // Toma el primer proyecto del store y va a su página de avances.
  await page.goto('/proyectos')
  const firstProject = page.locator('a[href^="/proyectos/"]').first()
  await firstProject.click()
  // Navegamos directo a /avances
  await page.goto(page.url().replace(/\/proyectos\/[^/]+.*/, (m) => m.match(/\/proyectos\/[^/]+/)![0] + '/avances'))
  await expect(page.getByRole('heading', { name: /Avances por partida/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Registrar avance/i })).toBeVisible()
})

test('flujo de caja renderiza con boton de ingreso esperado', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/proyectos')
  const firstProject = page.locator('a[href^="/proyectos/"]').first()
  await firstProject.click()
  await page.goto(page.url().replace(/\/proyectos\/[^/]+.*/, (m) => m.match(/\/proyectos\/[^/]+/)![0] + '/flujo-caja'))
  await expect(page.getByRole('heading', { name: /Flujo de caja/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ingreso esperado/i })).toBeVisible()
})
