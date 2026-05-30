import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Flujo end-to-end de nómina: login -> proyecto -> crear nómina ->
// agregar partida de mano de obra -> enviar -> aprobar.
// Solo valida que la UI responda; no valida cálculos.

test('flujo de nómina: crear, agregar partida, enviar y aprobar', async ({ page }) => {
  await loginDemo(page)

  // 1) Seleccionar el primer proyecto del listado.
  await page.goto('/proyectos')
  const firstProject = page.locator('a[href^="/proyectos/"], tr[class*="cursor-pointer"]').first()
  // Soporta tanto links como filas clickeables.
  const projectLink = page.locator('a[href^="/proyectos/"]').first()
  if (await projectLink.count()) {
    await projectLink.click()
  } else {
    await firstProject.click()
  }
  await expect(page).toHaveURL(/\/proyectos\/[^/]+$/)

  // 2) Abrir el modal de nuevo reporte de nómina (botón "Nuevo reporte").
  await page.getByRole('button', { name: /Nuevo reporte/i }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo reporte' })).toBeVisible()

  // 3) Crear la nómina (draft). El formulario precarga número y fecha.
  await page.getByRole('button', { name: /Crear reporte/i }).click()

  // Tras crear, la app navega a /nominas/:id; verificar editor.
  await expect(page).toHaveURL(/\/nominas\/[^/]+$/, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /Reporte No\. \d+/ })).toBeVisible()
  // Afordancia de borrador (el badge "Borrador" se duplica por responsive, así
  // que verificamos el botón "Agregar partida", que solo aparece en borrador).
  await expect(page.getByRole('button', { name: /Agregar partida/ }).first()).toBeVisible()

  // 4) Agregar una partida de mano de obra.
  await page
    .getByRole('button', { name: /Agregar partida|Agregar$/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Agregar partida de mano de obra' })).toBeVisible()

  // Seleccionar primer contratista disponible (omite la opción "Seleccionar..." y "Crear nuevo").
  const contractorSelect = page.locator('select').first()
  await contractorSelect.selectOption({ index: 1 })

  // Seleccionar primera tarea de mano de obra del proyecto.
  const taskSelect = page.locator('select').nth(1)
  await taskSelect.selectOption({ index: 1 })

  // Cantidad y precio (autocompleta desde la tarea, pero forzamos valores conocidos).
  await page.locator('input[inputmode="decimal"]').first().fill('5')
  await page.locator('input[inputmode="decimal"]').nth(1).fill('1000')

  // Botón de envío DENTRO del modal (hay otro "Agregar partida" en la sección).
  await page.getByRole('dialog').getByRole('button', { name: 'Agregar partida' }).click()

  // 5) Verificar que la partida aparece en la lista de mano de obra.
  // El modal cierra y la sección "Mano de obra" muestra al menos una fila/tarjeta.
  await expect(page.getByRole('heading', { name: 'Agregar partida de mano de obra' })).toBeHidden({ timeout: 5000 })
  // El mensaje "No hay partidas..." debe haber desaparecido.
  await expect(page.getByText('No hay partidas de mano de obra registradas')).toHaveCount(0)

  // 6) Enviar la nómina (draft -> submitted). Al enviar, el aprobador ve el
  // botón "Aprobar reporte" (confirma el estado enviado sin depender del badge).
  await page
    .getByRole('button', { name: /Enviar para aprobación/i })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /Aprobar reporte/i }).first()).toBeVisible({ timeout: 5000 })

  // 7) Aprobar la nómina (submitted -> approved). Tras aprobar aparece
  // "Marcar como pagado".
  await page
    .getByRole('button', { name: /Aprobar reporte/i })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /Marcar como pagado/i }).first()).toBeVisible({ timeout: 5000 })
})
