import { expect, test } from '@playwright/test'

// Smoke E2E para los flujos nuevos del Nivel 1.
// Modo demo: mockSupabase reinicia en memoria por sesión.

async function loginDemo(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Cristian' }).click()
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('crear solicitud sin partida queda en draft', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/ordenes-compra')
  await page.getByRole('button', { name: /Nueva solicitud/i }).click()

  const projectSelect = page.locator('select').first()
  await projectSelect.selectOption({ index: 1 })

  await page.getByPlaceholder(/Ej:/i).first().fill('50 sacos cemento')
  await page.getByPlaceholder('Nombre').fill('cristian')
  await page.getByRole('button', { name: /Crear solicitud/i }).click()

  // Después de crear, vuelve al listado y aparece la solicitud nueva.
  await expect(page.getByText('50 sacos cemento')).toBeVisible({ timeout: 5000 })
})

test('ruta /materiales muestra el catálogo global', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/materiales')
  await expect(page.getByRole('heading', { name: /Catálogo de Materiales/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nuevo material/i })).toBeVisible()
})

test('ruta /director carga KPIs consolidados', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/director')
  await expect(page.getByRole('heading', { name: /Dashboard Director General/i })).toBeVisible()
  await expect(page.getByText(/Empresas/)).toBeVisible()
})
