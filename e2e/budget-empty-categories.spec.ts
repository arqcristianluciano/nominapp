import { expect, test } from '@playwright/test'
import { loginDemo } from './helpers'

// Un proyecto recién creado trae las 23 partidas predeterminadas vacías (sin
// subpartidas, sin monto y sin gasto). El presupuesto debe avisar y ofrecer
// eliminarlas, pidiendo confirmación y dejando elegir cuáles.
test.describe('Limpieza de partidas vacías', () => {
  test('un proyecto nuevo avisa de partidas vacías y permite eliminarlas', async ({ page }) => {
    await loginDemo(page)
    await page.goto('/proyectos')

    const projectName = `PRUEBA VACIAS ${Date.now()}`
    await page.getByRole('button', { name: /Nuevo proyecto/i }).click()
    await expect(page.getByRole('heading', { name: 'Nuevo proyecto' })).toBeVisible()
    await page.getByPlaceholder('Ej: RESIDENCIA MARTÍNEZ').fill(projectName)
    const crear = page.getByRole('button', { name: 'Crear proyecto' })
    await expect(crear).toBeEnabled()
    await crear.click()

    // Abrir el proyecto recién creado y su presupuesto (navegación client-side
    // para no perder el estado del mock con un reload).
    await page.getByText(projectName).first().click()
    await expect(page).toHaveURL(/\/proyectos\/[^/]+$/)
    // El módulo "Presupuesto" del detalle (no el enlace del menú lateral a /presupuesto).
    await page.locator('a[href^="/proyectos/"][href$="/presupuesto"]').first().click()
    await expect(page).toHaveURL(/\/proyectos\/[^/]+\/presupuesto$/)

    // Un proyecto nuevo trae 23 partidas predeterminadas vacías: la cabecera
    // ofrece limpiarlas (sin abrir el modal de golpe).
    const cleanBtn = page.getByRole('button', { name: /Limpiar partidas vacías \(23\)/ })
    await expect(cleanBtn).toBeVisible()

    // Abrir el diálogo desde el botón.
    const dialog = page.getByRole('dialog', { name: 'Eliminar partidas vacías' })
    await cleanBtn.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('23 partidas vacías')).toBeVisible()

    // Conservar: el modal se cierra y queda el botón en la cabecera.
    await dialog.getByRole('button', { name: 'Conservar' }).click()
    await expect(dialog).toBeHidden()
    await expect(cleanBtn).toBeVisible()

    // Reabrir desde la cabecera y comprobar la selección con checkboxes.
    await cleanBtn.click()
    await expect(dialog).toBeVisible()
    const eliminar = dialog.getByRole('button', { name: /Eliminar/ })
    // Desmarcar "Seleccionar todas" deshabilita el botón de eliminar.
    await dialog.getByRole('checkbox').first().uncheck()
    await expect(eliminar).toBeDisabled()
    // Volver a marcar todas y eliminarlas.
    await dialog.getByRole('checkbox').first().check()
    await expect(eliminar).toBeEnabled()
    await eliminar.click()

    // Tras eliminar ya no hay aviso ni botón de limpieza.
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: /Limpiar partidas vacías/ })).toHaveCount(0)
  })
})
