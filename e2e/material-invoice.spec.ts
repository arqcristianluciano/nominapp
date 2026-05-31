import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Flujo de factura de materiales con varios ítems (modo demo, mockSupabase).
// Crea un reporte borrador, agrega una factura con 2 ítems SIN comprobante, y
// verifica el total en vivo, que la factura aparece detallada por ítem y que
// muestra la advertencia "Falta comprobante" (flujo "guardar con advertencia").

test('factura de materiales: varios ítems + advertencia de comprobante', async ({ page }) => {
  await loginDemo(page)

  // Crear un reporte borrador en RESIDENCIAL CAPULLO.
  await page.goto('/nominas')
  await page.getByRole('button', { name: 'Nuevo reporte' }).first().click()
  const createDialog = page.getByRole('dialog')
  await expect(createDialog).toBeVisible()
  await createDialog.getByRole('combobox').first().selectOption({ label: 'RESIDENCIAL CAPULLO' })
  await createDialog.getByRole('button', { name: 'Crear reporte' }).click()
  await expect(page).toHaveURL(/\/nominas\/[^/]+$/)

  // Abrir el modal de factura de materiales.
  await page.getByRole('button', { name: 'Agregar factura' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Agregar factura de materiales')).toBeVisible()

  // Proveedor (primer combobox del modal; el índice 0 es "Seleccionar...").
  await dialog.getByRole('combobox').first().selectOption({ index: 1 })

  // Agregar un segundo ítem y completar descripción + monto de ambos.
  await dialog.getByRole('button', { name: /Agregar ítem/i }).click()
  const descs = dialog.getByPlaceholder(/CEMENTO GRIS/)
  await descs.nth(0).fill('CEMENTO GRIS X50')
  await descs.nth(1).fill('ARENA PROCESADA')
  const amounts = dialog.getByLabel('Monto del ítem')
  await amounts.nth(0).fill('150000')
  await amounts.nth(1).fill('37500')

  // Total en vivo de la factura (150000 + 37500 = 187500); tolera separador local.
  await expect(dialog.getByText(/187[.,]500/)).toBeVisible()

  // Guardar SIN comprobante (permitido, con advertencia).
  await dialog.getByRole('button', { name: 'Guardar factura' }).click()
  await expect(page.getByText('Agregar factura de materiales')).toHaveCount(0)

  // La factura aparece detallada por ítem y marcada como pendiente de comprobante.
  await expect(page.getByText('No hay facturas de materiales registradas')).toHaveCount(0)
  await expect(page.getByText('CEMENTO GRIS X50')).toBeVisible()
  await expect(page.getByText('ARENA PROCESADA')).toBeVisible()
  await expect(page.getByText('Falta comprobante').first()).toBeVisible()
})
