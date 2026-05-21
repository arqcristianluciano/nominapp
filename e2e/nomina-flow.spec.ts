import { expect, test } from '@playwright/test'

// Flujo end-to-end de nómina: login admin -> proyecto -> crear nómina ->
// agregar partida de mano de obra -> enviar -> aprobar.
// Solo valida que la UI responda; no valida cálculos.

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  // Quick-access "Administrador" cuando hay backend real (admin@nominapp.local).
  // Fallback al demo user "Cristian" cuando corremos contra el mock store local.
  const adminButton = page.getByRole('button', { name: 'Administrador' })
  if (await adminButton.count()) {
    await adminButton.click()
    await page.waitForTimeout(200)
    if (!/\/$/.test(page.url())) {
      await page.getByRole('button', { name: 'Cristian' }).click()
      await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    }
  } else {
    await page.getByRole('button', { name: 'Cristian' }).click()
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }
  await expect(page).toHaveURL(/\/$/)
}

test('flujo de nómina: crear, agregar partida, enviar y aprobar', async ({ page }) => {
  await loginAdmin(page)

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

  // Tras crear, la app navega a /nominas/:id; verificar editor con estado Borrador.
  await expect(page).toHaveURL(/\/nominas\/[^/]+$/, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: /Reporte No\. \d+/ })).toBeVisible()
  await expect(page.getByText('Borrador').first()).toBeVisible()

  // 4) Agregar una partida de mano de obra.
  await page.getByRole('button', { name: /Agregar partida|Agregar$/ }).first().click()
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

  await page.getByRole('button', { name: /Agregar partida/ }).click()

  // 5) Verificar que la partida aparece en la lista de mano de obra.
  // El modal cierra y la sección "Mano de obra" muestra al menos una fila/tarjeta.
  await expect(page.getByRole('heading', { name: 'Agregar partida de mano de obra' })).toBeHidden({ timeout: 5000 })
  // El mensaje "No hay partidas..." debe haber desaparecido.
  await expect(page.getByText('No hay partidas de mano de obra registradas')).toHaveCount(0)

  // 6) Enviar la nómina (draft -> submitted).
  await page.getByRole('button', { name: /Enviar para aprobación/i }).first().click()
  await expect(page.getByText('Enviado').first()).toBeVisible({ timeout: 5000 })

  // 7) Aprobar la nómina (submitted -> approved).
  await page.getByRole('button', { name: /Aprobar reporte/i }).first().click()
  await expect(page.getByText('Aprobado').first()).toBeVisible({ timeout: 5000 })
})
