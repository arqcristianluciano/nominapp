import { describe, expect, it } from 'vitest'
import {
  assignImportCodes,
  budgetItemDisplayCode,
  maxBudgetItemSuffix,
  nextBudgetItemCode,
  partidaPrefix,
} from './budgetItemCode'
import type { BudgetCategory, BudgetItem } from '@/types/database'

function category(code: string, sort_order: number): Pick<BudgetCategory, 'code' | 'sort_order'> {
  return { code, sort_order }
}

function item(code: string | null): Pick<BudgetItem, 'code'> {
  return { code }
}

describe('partidaPrefix', () => {
  it('toma el número de partida del código ("1 - PRELIMINARES" -> "1")', () => {
    expect(partidaPrefix(category('1 - PRELIMINARES', 1))).toBe('1')
  })

  it('soporta prefijos alfanuméricos ("T2 - EXCAVACION" -> "T2")', () => {
    expect(partidaPrefix(category('T2 - EXCAVACION', 2))).toBe('T2')
  })

  it('usa el sort_order cuando el código no contiene dígitos', () => {
    expect(partidaPrefix(category('PRELIMINARES', 5))).toBe('5')
  })

  it('no se deja engañar por el sort_order cuando difiere del código', () => {
    // Caso del bug: el código dice "1" pero sort_order podría ser otro.
    expect(partidaPrefix(category('1 - PRELIMINARES', 3))).toBe('1')
  })
})

describe('nextBudgetItemCode', () => {
  it('continúa la secuencia: 1.1..1.4 -> 1.5 (el bug reportado)', () => {
    const items = [item('1.1'), item('1.2'), item('1.3'), item('1.4')]
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), items)).toBe('1.5')
  })

  it('arranca en .1 cuando la partida no tiene subpartidas', () => {
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), [])).toBe('1.1')
  })

  it('usa el prefijo del código y no el sort_order ("T2.1" -> "T2.2")', () => {
    const items = [item('T2.1')]
    expect(nextBudgetItemCode(category('T2 - EXCAVACION', 2), items)).toBe('T2.2')
  })

  it('no colisiona tras borrar filas intermedias (gaps -> max+1)', () => {
    const items = [item('1.1'), item('1.2'), item('1.5')]
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), items)).toBe('1.6')
  })

  it('ordena por valor numérico, no lexicográfico (1.9 + 1.10 -> 1.11)', () => {
    const items = [item('1.9'), item('1.10')]
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), items)).toBe('1.11')
  })

  it('cae a length+1 cuando las subpartidas no tienen código (importadas)', () => {
    const items = [item(null), item(null), item('')]
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), items)).toBe('1.4')
  })

  it('ignora códigos de otras partidas al contar el sufijo', () => {
    // Sólo las que siguen "1.<n>" cuentan; "2.7" se ignora.
    const items = [item('1.1'), item('2.7')]
    expect(nextBudgetItemCode(category('1 - PRELIMINARES', 1), items)).toBe('1.2')
  })
})

describe('budgetItemDisplayCode', () => {
  it('muestra el código almacenado cuando existe', () => {
    expect(budgetItemDisplayCode(category('1 - PRELIMINARES', 1), item('1.3'), 0)).toBe('1.3')
  })

  it('numera por posición cuando no hay código almacenado', () => {
    expect(budgetItemDisplayCode(category('1 - PRELIMINARES', 1), item(null), 0)).toBe('1.1')
    expect(budgetItemDisplayCode(category('1 - PRELIMINARES', 1), item(null), 3)).toBe('1.4')
  })

  it('respeta el prefijo alfanumérico en el respaldo', () => {
    expect(budgetItemDisplayCode(category('T2 - EXCAVACION', 2), item(null), 1)).toBe('T2.2')
  })
})

describe('maxBudgetItemSuffix', () => {
  it('devuelve el mayor sufijo que sigue el patrón de la partida', () => {
    const items = [item('1.1'), item('1.7'), item('1.3')]
    expect(maxBudgetItemSuffix(category('1 - PRELIMINARES', 1), items)).toBe(7)
  })

  it('devuelve 0 cuando ninguna subpartida sigue el patrón', () => {
    expect(maxBudgetItemSuffix(category('1 - PRELIMINARES', 1), [item(null), item('2.4')])).toBe(0)
  })
})

describe('assignImportCodes', () => {
  function importItem(code: string | null, budget_category_id: string) {
    return { code, budget_category_id, description: 'x' }
  }

  it('numera desde 1 las subpartidas sin código de una partida nueva', () => {
    const catById = new Map([['cat-1', category('1 - PRELIMINARES', 1)]])
    const result = assignImportCodes(
      [importItem(null, 'cat-1'), importItem(null, 'cat-1'), importItem(null, 'cat-1')],
      catById,
    )
    expect(result.map((r) => r.code)).toEqual(['1.1', '1.2', '1.3'])
  })

  it('continúa desde el mayor código existente de la partida', () => {
    const catById = new Map([['cat-1', category('1 - PRELIMINARES', 1)]])
    const existing = { 'cat-1': [item('1.1'), item('1.2')] }
    const result = assignImportCodes([importItem(null, 'cat-1'), importItem(null, 'cat-1')], catById, existing)
    expect(result.map((r) => r.code)).toEqual(['1.3', '1.4'])
  })

  it('respeta los códigos del Excel y continúa la secuencia sin colisión', () => {
    const catById = new Map([['cat-1', category('1 - PRELIMINARES', 1)]])
    const result = assignImportCodes(
      [importItem('1.5', 'cat-1'), importItem(null, 'cat-1'), importItem(null, 'cat-1')],
      catById,
    )
    expect(result.map((r) => r.code)).toEqual(['1.5', '1.6', '1.7'])
  })

  it('numera por partida de forma independiente (prefijos distintos)', () => {
    const catById = new Map([
      ['cat-1', category('1 - PRELIMINARES', 1)],
      ['cat-t2', category('T2 - EXCAVACION', 2)],
    ])
    const result = assignImportCodes(
      [importItem(null, 'cat-1'), importItem(null, 'cat-t2'), importItem(null, 'cat-1')],
      catById,
    )
    expect(result.map((r) => r.code)).toEqual(['1.1', 'T2.1', '1.2'])
  })

  it('deja el ítem intacto si su categoría no es conocida', () => {
    const result = assignImportCodes([importItem(null, 'desconocida')], new Map())
    expect(result[0].code).toBeNull()
  })
})
