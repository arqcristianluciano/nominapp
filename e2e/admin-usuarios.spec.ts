import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Smoke test para /admin/usuarios. En modo demo el usuario "cristian" tiene
// todas las capabilities (incluida manage_users), así que cubre este flujo.

test('admin/usuarios: tabs Personas, Matriz de permisos y Roles renderizan', async ({ page }) => {
  await loginDemo(page)

  await page.goto('/admin/usuarios')
  await expect(page.getByRole('heading', { name: 'Administración de usuarios' })).toBeVisible()

  // 1) Tab Personas — debe mostrar la tabla de usuarios.
  await page.getByRole('button', { name: /Personas/ }).click()
  await expect(page.getByRole('columnheader', { name: 'Persona' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nuevo usuario/i })).toBeVisible()

  // 2) Tab Matriz de permisos — debe mostrar el grid de capacidades (tabla).
  await page.getByRole('button', { name: /Matriz de permisos/ }).click()
  await expect(page.getByRole('table')).toBeVisible()

  // 3) Tab Roles — debe mostrar el botón para crear rol.
  await page.getByRole('button', { name: /^Roles$/ }).click()
  await expect(page.getByRole('button', { name: /Nuevo rol/i })).toBeVisible()
})
