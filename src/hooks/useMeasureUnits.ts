import { useCallback, useEffect, useState } from 'react'
import { fallbackMeasureUnits, measureUnitService, type MeasureUnitOption } from '@/services/measureUnitService'

/**
 * Catálogo de unidades de medida para los selects de unidad.
 * Carga el catálogo guardado en la base de datos (con las unidades añadidas
 * por el usuario) y permite registrar unidades nuevas. Mientras carga, o si
 * la consulta falla, ofrece el catálogo fijo de siempre.
 */
export function useMeasureUnits() {
  const [units, setUnits] = useState<MeasureUnitOption[]>(fallbackMeasureUnits())

  useEffect(() => {
    let cancelled = false
    measureUnitService
      .getAll()
      .then((next) => {
        if (!cancelled) setUnits(next)
      })
      .catch(() => {
        // Sin conexión o tabla no disponible: se mantiene el catálogo fijo.
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Crea la unidad y devuelve su código (lo que se guarda en el campo unit). */
  const addUnit = useCallback(async (label: string): Promise<MeasureUnitOption> => {
    const created = await measureUnitService.create(label)
    try {
      setUnits(await measureUnitService.getAll())
    } catch {
      // Si la relectura falla, al menos se añade la unidad recién creada.
      setUnits((prev) => [...prev, created])
    }
    return created
  }, [])

  return { units, addUnit }
}
