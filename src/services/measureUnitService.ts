import { supabase } from '@/lib/supabase'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import type { MeasureUnitRecord } from '@/types/database'

/** Unidad tal como la consumen los selects: valor guardado + texto visible. */
export interface MeasureUnitOption {
  code: string
  label: string
}

// Cache de módulo: el catálogo se consulta desde muchos formularios (cada
// línea de una solicitud tiene su propio select) y casi nunca cambia.
let cache: MeasureUnitOption[] | null = null
let pending: Promise<MeasureUnitOption[]> | null = null

/** Catálogo fijo de respaldo: se usa mientras carga la tabla o si falla. */
export function fallbackMeasureUnits(): MeasureUnitOption[] {
  return MEASURE_UNITS.map((u) => ({ code: u.value, label: u.label }))
}

export const measureUnitService = {
  /** Lista el catálogo de unidades (con cache compartida entre formularios). */
  async getAll(): Promise<MeasureUnitOption[]> {
    if (cache) return cache
    if (pending) return pending
    pending = (async () => {
      try {
        const { data, error } = await supabase
          .from('measure_units')
          .select('code, label, sort_order')
          .order('sort_order', { ascending: true })
          .order('label', { ascending: true })
        if (error) throw error
        const rows = (data ?? []) as Pick<MeasureUnitRecord, 'code' | 'label' | 'sort_order'>[]
        // Tabla vacía o inexistente (modo demo): usar el catálogo fijo.
        cache = rows.length > 0 ? rows.map((r) => ({ code: r.code, label: r.label })) : fallbackMeasureUnits()
        return cache
      } finally {
        pending = null
      }
    })()
    return pending
  },

  /** Registra una unidad nueva (queda guardada para todos los formularios). */
  async create(label: string): Promise<MeasureUnitOption> {
    const clean = label.trim()
    if (!clean) throw new Error('Escribe el nombre de la unidad.')
    const { data, error } = await supabase
      .from('measure_units')
      .insert({ code: clean, label: clean })
      .select('code, label')
      .single()
    if (error) {
      // 23505 = ya existe una unidad con ese nombre (índice único sin mayúsculas)
      if ((error as { code?: string }).code === '23505') {
        throw new Error(`La unidad "${clean}" ya existe.`)
      }
      throw error
    }
    cache = null
    return data as MeasureUnitOption
  },

  /** Vacía la cache (tras crear una unidad, para releer el catálogo). */
  clearCache() {
    cache = null
  },
}
