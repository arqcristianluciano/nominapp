import { test, expect } from '@playwright/test'
import { loginDemo } from './helpers'

// Verifica el alta rápida de proveedor (selector reutilizable SupplierSelect)
// desde el modal de cotización de una orden de compra. Modo demo (mockSupabase):
// req004 es una requisición en borrador, por lo que permite agregar cotizaciones.

test('cotización de compra: agregar proveedor sin salir (nombre, teléfono y banco)', async ({ page }) => {
  await loginDemo(page)
  await page.goto('/ordenes-compra/req004')

  await page.getByRole('button', { name: 'Agregar cotización' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Agregar cotización' })).toBeVisible()

  // Abrir el alta rápida de proveedor desde el selector.
  await dialog.getByRole('combobox').first().selectOption('__NEW__')
  await expect(dialog.getByText('Nuevo proveedor')).toBeVisible()

  // Nombre duplicado (sembrado): bloquea y avisa.
  await dialog.getByPlaceholder('Nombre *').fill('ferretería bellón')
  await dialog.getByRole('button', { name: 'Crear y seleccionar' }).click()
  await expect(dialog.getByText(/Ya existe un proveedor llamado/i)).toBeVisible()

  // Teléfono inválido: bloquea y avisa.
  await dialog.getByPlaceholder('Nombre *').fill('NUEVO SUPLIDOR DEMO')
  await dialog.getByPlaceholder('Teléfono (opcional)').fill('123')
  await dialog.getByRole('button', { name: 'Crear y seleccionar' }).click()
  await expect(dialog.getByText(/Teléfono inválido/i)).toBeVisible()

  // Datos válidos: crea el proveedor y cierra el mini-formulario.
  await dialog.getByPlaceholder('Teléfono (opcional)').fill('809-555-7777')
  await dialog.getByPlaceholder('Banco (opcional)').fill('Banco Popular')
  await dialog.getByRole('button', { name: 'Crear y seleccionar' }).click()
  await expect(dialog.getByText('Nuevo proveedor')).toHaveCount(0)
})
