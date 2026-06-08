import { describe, it, expect } from 'vitest'
import { filterIndex } from './globalSearchService'

type SearchIndex = Parameters<typeof filterIndex>[0]

const sampleIndex: SearchIndex = {
  suppliers: [
    { id: 's1', name: 'Ferretería López', rnc: '123-456-789' },
    { id: 's2', name: 'Materiales del Norte', rnc: null },
  ],
  contractors: [
    { id: 'c1', name: 'Juan Pérez', specialty: 'Electricidad', cedula: '001-1234567-8' },
    { id: 'c2', name: 'María González', specialty: null, cedula: null },
  ],
  loans: [
    { id: 'l1', contractorName: 'Juan Pérez', status: 'active', notes: 'Herramienta' },
    { id: 'l2', contractorName: 'Pedro Ramírez', status: 'paid', notes: null },
  ],
  contracts: [
    { id: 'ct1', projectId: 'p1', projectName: 'Residencial Capullo', contractorName: 'Juan Pérez' },
    { id: 'ct2', projectId: 'p2', projectName: 'Torre Mirador', contractorName: 'Ferroviaria SA' },
  ],
}

const sampleProjects = [
  { id: 'p1', name: 'Residencial Capullo', code: 'RC-2026', location: 'Arroyo Hondo' },
  { id: 'p2', name: 'Torre Mirador del Este', code: 'TME-2026', location: 'Los Cacicazgos' },
]

describe('filterIndex', () => {
  it('retorna vacío si la query está vacía', () => {
    expect(filterIndex(sampleIndex, sampleProjects, '')).toEqual([])
    expect(filterIndex(sampleIndex, sampleProjects, '   ')).toEqual([])
  })

  it('encuentra proyectos por nombre', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'capullo')
    expect(results.some((r) => r.type === 'proyecto' && r.id === 'p1')).toBe(true)
  })

  it('encuentra proyectos por código', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'TME')
    expect(results.some((r) => r.type === 'proyecto' && r.id === 'p2')).toBe(true)
  })

  it('encuentra contratistas por nombre', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'juan')
    expect(results.some((r) => r.type === 'contratista' && r.id === 'c1')).toBe(true)
  })

  it('encuentra contratistas por cédula', () => {
    const results = filterIndex(sampleIndex, sampleProjects, '001-1234567')
    expect(results.some((r) => r.type === 'contratista' && r.id === 'c1')).toBe(true)
  })

  it('encuentra suplidores por nombre', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'ferretería')
    expect(results.some((r) => r.type === 'suplidor' && r.id === 's1')).toBe(true)
  })

  it('encuentra suplidores por RNC', () => {
    const results = filterIndex(sampleIndex, sampleProjects, '123-456')
    expect(results.some((r) => r.type === 'suplidor' && r.id === 's1')).toBe(true)
  })

  it('encuentra préstamos por nombre del contratista', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'pedro')
    expect(results.some((r) => r.type === 'prestamo' && r.id === 'l2')).toBe(true)
  })

  it('encuentra préstamos por notas', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'herramienta')
    expect(results.some((r) => r.type === 'prestamo' && r.id === 'l1')).toBe(true)
  })

  it('encuentra contratos por nombre de contratista', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'ferroviaria')
    expect(results.some((r) => r.type === 'contrato' && r.id === 'ct2')).toBe(true)
  })

  it('encuentra contratos por nombre del proyecto', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'mirador')
    expect(results.some((r) => r.type === 'contrato' && r.id === 'ct2')).toBe(true)
  })

  it('el enlace del contrato apunta a la cubicación correcta', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'ferroviaria')
    const r = results.find((r) => r.type === 'contrato' && r.id === 'ct2')
    expect(r?.url).toBe('/proyectos/p2/cubicaciones/ct2')
  })

  it('el enlace del préstamo apunta a /prestamos', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'juan')
    const r = results.find((r) => r.type === 'prestamo')
    expect(r?.url).toBe('/prestamos')
  })

  it('respeta maxPerType (default 4)', () => {
    const bigIndex: SearchIndex = {
      ...sampleIndex,
      contractors: Array.from({ length: 10 }, (_, i) => ({
        id: `cx${i}`,
        name: `Contratista Test ${i}`,
        specialty: null,
        cedula: null,
      })),
    }
    const results = filterIndex(bigIndex, sampleProjects, 'test')
    const contractorResults = results.filter((r) => r.type === 'contratista')
    expect(contractorResults.length).toBeLessThanOrEqual(4)
  })

  it('la búsqueda es insensible a mayúsculas', () => {
    const results = filterIndex(sampleIndex, sampleProjects, 'CAPULLO')
    expect(results.some((r) => r.type === 'proyecto' && r.id === 'p1')).toBe(true)
  })
})
