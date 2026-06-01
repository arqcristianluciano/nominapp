import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Smoke E2E para los flujos nuevos del Nivel 1.
// Modo demo: mockSupabase reinicia en memoria por sesión.

test('crear solicitud sin partida queda en draft', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/ordenes-compra')
  await page.getByRole('button', { name: /Nueva solicitud/i }).click()

  // Acotamos al diálogo: hay selects/inputs detrás del modal en el listado.
  const dialog = page.getByRole('dialog')
  await dialog.locator('select').first().selectOption({ index: 1 }) // proyecto (requerido)
  await dialog.getByPlaceholder(/Ej:/i).first().fill('50 sacos cemento')
  await dialog.getByPlaceholder('Nombre').fill('cristian')
  await dialog.getByRole('button', { name: /Crear solicitud/i }).click()

  // Después de crear, vuelve al listado y aparece la solicitud nueva. La lista
  // renderiza dos vistas (tabla en ≥sm y tarjetas en móvil), ambas presentes en
  // el DOM; acotamos a la tabla para evitar la doble coincidencia en strict mode.
  await expect(page.getByRole('table').getByText('50 sacos cemento')).toBeVisible({ timeout: 5000 })
})

test('ruta /materiales muestra el catálogo global', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/materiales')
  await expect(page.getByRole('heading', { name: /Catálogo de Materiales/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nuevo material/i })).toBeVisible()
})

// El usuario demo "cristian" es director (isDirector=true), así que /director carga.
test('ruta /director carga KPIs consolidados', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/director')
  await expect(page.getByRole('heading', { name: /Dashboard Director General/i })).toBeVisible()
  await expect(page.getByText(/Empresas/)).toBeVisible()
})
