import { expect, test } from '@playwright/test'

// Smoke E2E del flujo de recepción de mercancía (rol Almacenista).
// Usa la OC seedeada 'req001' (REQ-2026-0021), que está en estado "Orden
// colocada" con una cotización aprobada de dos materiales. Verifica que la UI
// de recepción renderiza correctamente. No confirma la recepción para no mutar
// el estado compartido del mock entre tests/reintentos; la lógica de recepción
// está cubierta por los tests unitarios.

// En modo demo solo autentican las cuentas de demoUsers (cristian/roni) y
// useProjectRoles otorga todas las capabilities (incluida receive_order), por lo
// que el flujo de recepción es visible. Mismo patrón que budget-flows.spec.
async function loginDemo(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  // Credenciales de demoUsers; selectores independientes del idioma de la UI.
  await page.getByRole('textbox').first().fill('cristian')
  await page.locator('input[type="password"]').fill('cristian123')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
}

test('recepción: la OC colocada muestra el botón y el modal con líneas y conduce', async ({ page }) => {
  await loginDemo(page)

  await page.goto('/ordenes-compra/req001')
  await expect(page.getByRole('heading', { name: 'REQ-2026-0021' })).toBeVisible()

  // El botón de recepción está disponible para una OC colocada.
  const receiveBtn = page.getByRole('button', { name: /Recibir mercancía/i }).first()
  await expect(receiveBtn).toBeVisible()
  await receiveBtn.click()

  // El modal muestra la tabla de materiales pendientes de la cotización aprobada.
  const modal = page.getByRole('dialog')
  await expect(modal.getByRole('heading', { name: 'Recibir mercancía' })).toBeVisible()
  await expect(modal.getByText('BLOQUE 6" ESTÁNDAR')).toBeVisible()
  await expect(modal.getByText('CEMENTO GRIS 94LB')).toBeVisible()

  // Conduce opcional y botón de confirmar presentes.
  await expect(modal.getByText(/Conduce \/ nota de entrega/i)).toBeVisible()
  await expect(modal.getByRole('button', { name: /Confirmar recepción/i })).toBeVisible()
})
