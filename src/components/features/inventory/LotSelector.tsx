import { useEffect, useState } from 'react'
import { lotService, type InventoryLot } from '@/services/lotService'
import { useToast } from '@/components/ui/Toast'

interface LotSelectorProps {
  itemId: string
  selectedLotId?: string | null
  onChange: (lotId: string | null) => void
  required?: boolean
}

const INPUT_CLS =
  'w-full min-h-[44px] px-3 py-2.5 sm:py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none'

function formatReceivedDate(value: string | null): string {
  if (!value) return 'sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function LotSelector({
  itemId,
  selectedLotId,
  onChange,
  required = false,
}: LotSelectorProps) {
  const { error: toastError } = useToast()
  const [lots, setLots] = useState<InventoryLot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!itemId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLots([])
      return
    }
    let cancelled = false
    setLoading(true)
    lotService
      .getAvailable(itemId)
      .then((data) => {
        if (cancelled) return
        setLots(data)
      })
      .catch((err) => {
        if (cancelled) return
        setLots([])
        const message = err instanceof Error ? err.message : 'Error desconocido'
        toastError(`Error al cargar lotes: ${message}`)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, toastError])

  const value = selectedLotId ?? ''
  const disabled = loading || !itemId

  return (
    <div>
      <label className="text-xs text-app-muted block mb-1">
        Lote {required ? '*' : '(opcional)'}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value
            onChange(next === '' ? null : next)
          }}
          required={required}
          disabled={disabled}
          className={`${INPUT_CLS} pr-8`}
        >
          {!required && <option value="">Sin lote específico</option>}
          {required && (
            <option value="" disabled>
              {loading ? 'Cargando lotes…' : 'Selecciona un lote'}
            </option>
          )}
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.lot_number} · {lot.quantity} disp. · {formatReceivedDate(lot.received_date)}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-app-subtle text-xs"
        >
          ▾
        </span>
      </div>
      {loading && itemId && (
        <p className="text-[10px] text-app-subtle mt-1">Cargando lotes disponibles…</p>
      )}
      {!loading && lots.length === 0 && itemId && (
        <p className="text-[10px] text-app-subtle mt-1">
          No hay lotes con stock disponible para este ítem.
        </p>
      )}
    </div>
  )
}
