import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Verifica el alta rápida de proveedor desde el modal de factura de materiales:
// 1) bloquea crear un proveedor cuyo nombre ya existe (aviso), y
// 2) permite crear uno con nombre nuevo (cierra el mini-formulario).
// Modo demo (mockSupabase): el proveedor "Ferretería Bellón" está sembrado.

test('factura de materiales: no permite proveedor duplicado y sí crea uno nuevo', async ({ page }) => {
  await loginDemo(page)

  // Crear un reporte de nómina en borrador (estado que permite agregar facturas).
  await page.goto('/nominas')
  await page.getByRole('button', { name: 'Nuevo reporte' }).first().click()
  const createDialog = page.getByRole('dialog')
  await expect(createDialog).toBeVisible()
  await createDialog.getByRole('combobox').first().selectOption({ label: 'RESIDENCIAL CAPULLO' })
  await createDialog.getByRole('button', { name: 'Crear reporte' }).click()
  await expect(page).toHaveURL(/\/nominas\/[^/]+$/)

  // Abrir el modal "Agregar factura de materiales".
  await page.getByRole('button', { name: 'Agregar factura' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Agregar factura de materiales' })).toBeVisible()

  // Elegir "＋ Agregar proveedor" (value interno __NEW__) para abrir el mini-formulario.
  await dialog.getByRole('combobox').first().selectOption('__NEW__')
  await expect(dialog.getByText('Nuevo proveedor')).toBeVisible()

  // 1) Intentar crear un proveedor con un nombre que YA existe (sembrado): debe bloquear y avisar.
  await dialog.getByPlaceholder('Nombre *').fill('ferretería bellón') // distinto case a propósito
  await dialog.getByRole('button', { name: 'Crear y seleccionar' }).click()
  await expect(dialog.getByText(/Ya existe un proveedor llamado/i)).toBeVisible()
  // El mini-formulario sigue abierto (no se creó nada).
  await expect(dialog.getByText('Nuevo proveedor')).toBeVisible()

  // 2) Cambiar a un nombre nuevo y crear: el aviso desaparece y el mini-formulario se cierra.
  await dialog.getByPlaceholder('Nombre *').fill('BLOQUERA DEL ESTE')
  await dialog.getByRole('button', { name: 'Crear y seleccionar' }).click()
  await expect(dialog.getByText(/Ya existe un proveedor llamado/i)).toHaveCount(0)
  await expect(dialog.getByText('Nuevo proveedor')).toHaveCount(0)
})
