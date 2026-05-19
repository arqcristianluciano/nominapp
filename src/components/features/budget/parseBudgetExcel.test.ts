import { describe, it, expect } from 'vitest'
import { parseRows } from './parseBudgetExcel'
import type { BudgetCategory } from '@/types/database'

const cat = (overrides: Partial<BudgetCategory>): BudgetCategory => ({
  id: 'id-default',
  project_id: 'proj-1',
  code: 'X',
  name: 'Default',
  sort_order: 0,
  budgeted_amount: 0,
  start_date: null,
  end_date: null,
  ...overrides,
})

describe('parseRows (Excel import)', () => {
  const defaults: BudgetCategory[] = [
    cat({ id: 'cat-preliminares', code: '1 - PRELIMINARES', name: 'Preliminares', sort_order: 1 }),
    cat({ id: 'cat-demoliciones', code: '2 - DEMOLICIONES', name: 'Demoliciones', sort_order: 2 }),
    cat({ id: 'cat-estructura', code: '3 - ESTRUCTURA', name: 'Estructura', sort_order: 3 }),
  ]

  it('matchea capítulos existentes por nombre (case insensitive) y deja partidas creadas con id real', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [1, 'PRELIMINARES', '', '', ''],
      ['1.01', 'Campamento', 'pa', 1, 1000000],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories).toHaveLength(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].valid).toBe(true)
    expect(result.items[0].categoryId).toBe('cat-preliminares')
    expect(result.items[0].isNewCategory).toBe(false)
    expect(result.items[0].quantity).toBe(1)
    expect(result.items[0].unit_price).toBe(1000000)
  })

  it('crea categoría nueva cuando el nombre del capítulo no aparece en las existentes', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [2, 'MOVIMIENTO DE TIERRA', '', '', ''],
      ['2.01', 'Corte y bote', 'm3', 1500, 650],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories).toHaveLength(1)
    expect(result.newCategories[0].name).toBe('MOVIMIENTO DE TIERRA')
    expect(result.newCategories[0].sort_order).toBe(4) // max existing (3) + 1
    expect(result.items[0].valid).toBe(true)
    expect(result.items[0].isNewCategory).toBe(true)
    expect(result.items[0].categoryId).toBeNull()
    expect(result.items[0].newCategoryKey).toBe(result.newCategories[0].key)
  })

  it('procesa correctamente el archivo reportado por el usuario (mezcla de match + creación)', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [1, 'PRELIMINARES', '', '', ''],
      ['1.01', 'Campamento', 'pa', 1, 1000000],
      [2, 'MOVIMIENTO DE TIERRA', '', '', ''],
      ['2.01', 'Cort y bote', 'm3', 1500, 650],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories).toHaveLength(1)
    expect(result.newCategories[0].name).toBe('MOVIMIENTO DE TIERRA')
    expect(result.items).toHaveLength(2)
    expect(result.items.every((i) => i.valid)).toBe(true)
    expect(result.items[0].categoryId).toBe('cat-preliminares')
    expect(result.items[0].isNewCategory).toBe(false)
    expect(result.items[1].isNewCategory).toBe(true)
    expect(result.items[1].categoryId).toBeNull()
  })

  it('marca subpartidas sin capítulo previo como inválidas', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      ['9.99', 'Subpartida huérfana', 'm2', 10, 50],
    ]
    const result = parseRows(rows, defaults)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].valid).toBe(false)
    expect(result.items[0].error).toBe('No se detectó partida principal')
  })

  it('deduplica múltiples capítulos con el mismo nombre y sigue creando subpartidas bajo el mismo', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      ['', 'OBRA EXTRA', '', '', ''],
      ['e.1', 'Item A', 'gl', 1, 100],
      ['', 'OBRA EXTRA', '', '', ''],
      ['e.2', 'Item B', 'gl', 2, 200],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories).toHaveLength(1)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].newCategoryKey).toBe(result.items[1].newCategoryKey)
  })

  it('ignora la fila de encabezados literales y filas vacías', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      ['', '', '', '', ''],
      [1, 'PRELIMINARES', '', '', ''],
      ['1.01', 'Campamento', 'pa', 1, 1000000],
    ]
    const result = parseRows(rows, defaults)
    expect(result.items).toHaveLength(1)
    expect(result.newCategories).toHaveLength(0)
  })

  it('respeta los códigos custom de capítulos nuevos y los compone con el nombre en mayúsculas', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      ['T', 'Trabajos especiales', '', '', ''],
      ['t.1', 'Ensayos de laboratorio', 'u', 5, 1500],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories[0].name).toBe('Trabajos especiales')
    expect(result.newCategories[0].code).toBe('T - TRABAJOS ESPECIALES')
  })

  it('matchea capítulos ignorando acentos (HORMIGON ↔ Hormigón)', () => {
    const cats: BudgetCategory[] = [
      cat({ id: 'cat-hormigon', name: 'Hormigón armado', sort_order: 4 }),
    ]
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [4, 'HORMIGON ARMADO', '', '', ''],
      ['4.01', 'Losa', 'm3', 50, 8000],
    ]
    const result = parseRows(rows, cats)
    expect(result.newCategories).toHaveLength(0)
    expect(result.items[0].categoryId).toBe('cat-hormigon')
  })

  it('crea sort_order incrementales para múltiples capítulos nuevos', () => {
    const rows = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [2, 'MOVIMIENTO DE TIERRA', '', '', ''],
      ['2.01', 'Corte', 'm3', 100, 500],
      [4, 'OBRA EXTERIOR', '', '', ''],
      ['4.01', 'Cerca perimetral', 'ml', 50, 800],
    ]
    const result = parseRows(rows, defaults)
    expect(result.newCategories).toHaveLength(2)
    expect(result.newCategories[0].sort_order).toBe(4)
    expect(result.newCategories[1].sort_order).toBe(5)
  })
})
