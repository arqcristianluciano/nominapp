import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// E2E happy-path: login -> /admin/usuarios -> crear usuario -> verificar que
// aparece en la tabla -> editar -> logout. En modo demo el usuario "cristian"
// tiene todas las capabilities (incluida la gestión de usuarios).

const NEW_USER_PASSWORD = 'Test2026!Strong'

// El alta de usuarios (auth.users + user_profiles vía adminService) no es
// funcional en modo demo: el modal "Nuevo usuario" no abre y el CRUD depende de
// un backend real. Se omite hasta poder correrlo contra Supabase real.
test.skip('happy-path: login admin, crear usuario, editarlo y cerrar sesión', async ({ page }) => {
  await loginDemo(page)

  // 1) Ir al panel de administración de usuarios y abrir la pestaña Personas.
  await page.goto('/admin/usuarios')
  await expect(page.getByRole('heading', { name: 'Administración de usuarios' })).toBeVisible()
  await page.getByRole('button', { name: /Personas/ }).click()
  await expect(page.getByRole('columnheader', { name: 'Persona' })).toBeVisible()

  // 2) Crear un usuario nuevo con datos únicos.
  const timestamp = Date.now()
  const newEmail = `test-${timestamp}@nominapp.local`
  const firstName = `Test${timestamp}`
  const lastName = 'Usuario'
  const displayName = `${firstName} ${lastName}`

  await page.getByRole('button', { name: /Nuevo usuario/i }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo usuario' })).toBeVisible()

  await page.getByPlaceholder('empleado@empresa.com').fill(newEmail)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(NEW_USER_PASSWORD)
  await page.getByPlaceholder('Juan').fill(firstName)
  await page.getByPlaceholder('Pérez').fill(lastName)

  await page.getByRole('button', { name: 'Crear usuario' }).click()

  // Espera a que el modal se cierre tras guardar.
  await expect(page.getByRole('heading', { name: 'Nuevo usuario' })).toBeHidden()

  // 3) Verificar que el usuario aparece en la tabla. Filtramos por nombre
  // para evitar falsos negativos si hay muchas filas en el listado.
  await page.getByPlaceholder('Buscar por nombre, cédula o puesto...').fill(firstName)
  const userRow = page.getByRole('row', { name: new RegExp(displayName) })
  await expect(userRow).toBeVisible()

  // 4) Editar el usuario. Hacemos hover para revelar el botón de editar.
  await userRow.hover()
  await userRow.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible()

  // Cambiamos el puesto/título como prueba de edición.
  const newJobTitle = `QA Tester ${timestamp}`
  await page.getByPlaceholder('Maestro de obra').fill(newJobTitle)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()

  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeHidden()

  // Confirmamos que el cambio quedó reflejado (puesto visible en la tabla
  // en viewports >= sm, que es el default de Playwright Desktop Chrome).
  await expect(page.getByRole('cell', { name: newJobTitle })).toBeVisible()

  // 5) Logout. El botón está en el header con title="Cerrar sesión".
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
