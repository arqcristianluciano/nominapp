import { expect, test } from '@playwright/test'
import { DEMO_PROJECT_ID, loginDemo } from './helpers'

test('página de aprobaciones renderiza el inbox', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/aprobaciones')
  await expect(page.getByRole('heading', { name: /Aprobaciones y auditoría/i })).toBeVisible()
  await expect(page.getByText(/Solo mis aprobaciones/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible()
})

test('captura de avance de partida desde la página de avances', async ({ page }) => {
  await loginDemo(page)
  // El listado de proyectos rinde filas clickeables (no <a>), así que vamos
  // directo a la subruta del proyecto sembrado.
  await page.goto(`/proyectos/${DEMO_PROJECT_ID}/avances`)
  await expect(page.getByRole('heading', { name: /Avances por partida/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Registrar avance/i })).toBeVisible()
})

test('flujo de caja renderiza con boton de ingreso esperado', async ({ page }) => {
  await loginDemo(page)
  await page.goto(`/proyectos/${DEMO_PROJECT_ID}/flujo-caja`)
  await expect(page.getByRole('heading', { name: /Flujo de caja/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ingreso esperado/i })).toBeVisible()
})
