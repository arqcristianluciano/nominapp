import { expect, type Page } from '@playwright/test'

// Login demo compartido por todos los specs.
//
// En modo demo (mockSupabase, sin .env) los botones de quick-access usan
// TEST_USERS (no DEMO_USERS) y NO autentican; por eso entramos por el
// formulario manual con credenciales demo. Selectores por id para no depender
// del idioma de la página de login (internacionalizada).
//
// El usuario demo "cristian" recibe todas las capabilities (DEMO_CAPS), así que
// este helper sirve también para flujos de admin/director — por eso reemplaza a
// los antiguos `loginAdmin`.
export async function loginDemo(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#login-user').fill('cristian')
  await page.locator('#login-pass').fill('cristian123')
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/$/)
}
