import { Fragment, useEffect, useMemo, useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

export interface PendingReceiptLine {
  quote_item_id: string | null
  description: string
  unit: string | null
  unit_price: number | null
  ordered_quantity: number
  received_quantity: number
  remaining_quantity: number
}

interface Props {
  open: boolean
  lines: PendingReceiptLine[]
  saving?: boolean
  onClose: () => void
  onSubmit: (
    receipts: { quote_item_id: string; quantity: number; lot_number?: string | null; expiry_date?: string | null }[],
  ) => void
}

// Modal de recepción de mercancía. Permite recibir cada línea total o
// parcialmente: cada campo arranca con el pendiente y puede reducirse para
// registrar una entrega parcial. Las OC sin líneas de cotización (fallback) se
// reciben completas.
export function ReceiveOrderModal({ open, lines, saving = false, onClose, onSubmit }: Props) {
  const trackable = lines.filter((l) => l.quote_item_id)
  const isFallback = trackable.length === 0 && lines.length > 0

  // Cantidad a recibir por línea (string para edición controlada).
  const [qty, setQty] = useState<Record<string, string>>({})
  // Lote/vencimiento opcionales por línea (trazabilidad).
  const [lotInfo, setLotInfo] = useState<Record<string, { lot_number: string; expiry_date: string }>>({})

  useEffect(() => {
    if (!open) return
    const init: Record<string, string> = {}
    for (const l of trackable) init[l.quote_item_id as string] = String(l.remaining_quantity)
    setQty(init)
    setLotInfo({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsed = useMemo(
    () =>
      trackable.map((l) => {
        const id = l.quote_item_id as string
        const raw = qty[id] ?? ''
        const n = raw === '' ? 0 : Number(raw)
        const invalid = raw !== '' && (isNaN(n) || n < 0 || n > l.remaining_quantity + 1e-9)
        return { line: l, id, value: raw, n, invalid }
      }),
    [trackable, qty],
  )

  const totalToReceive = parsed.reduce((s, p) => s + (p.invalid ? 0 : p.n), 0)
  const anyInvalid = parsed.some((p) => p.invalid)
  const canSubmit = !saving && !anyInvalid && (isFallback || totalToReceive > 0)

  function submit() {
    if (!canSubmit) return
    if (isFallback) {
      onSubmit([])
      return
    }
    const receipts = parsed
      .filter((p) => !p.invalid && p.n > 0)
      .map((p) => ({
        quote_item_id: p.id,
        quantity: p.n,
        lot_number: lotInfo[p.id]?.lot_number?.trim() || null,
        expiry_date: lotInfo[p.id]?.expiry_date || null,
      }))
    onSubmit(receipts)
  }

  return (
    <Modal open={open} onClose={onClose} title="Recibir mercancía" width="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-app-muted">
          Indica la cantidad recibida de cada material. Puedes recibir parcialmente: lo que recibas entra al stock del
          proyecto y el resto queda pendiente.
        </p>

        {isFallback ? (
          <div className="rounded-lg border border-app-border p-4 text-sm">
            <p className="font-medium text-app-text">{lines[0]?.description}</p>
            <p className="text-app-muted mt-1">
              {lines[0]?.ordered_quantity} {lines[0]?.unit ?? ''} — se recibirá la orden completa (sin desglose por
              línea).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-app-subtle border-b border-app-border">
                  <th className="py-2 pr-2 font-medium">Material</th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">Pedido</th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">Recibido</th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">Pendiente</th>
                  <th className="py-2 pl-2 font-medium text-right whitespace-nowrap">Recibir ahora</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map(({ line, id, value, invalid, n }) => {
                  const done = line.remaining_quantity <= 1e-9
                  const showLot = !done && n > 0
                  return (
                    <Fragment key={id}>
                      <tr className="border-b border-app-border/60 last:border-0">
                        <td className="py-2 pr-2">
                          <p className="text-app-text break-words">{line.description}</p>
                          <p className="text-app-subtle text-xs">{line.unit}</p>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{line.ordered_quantity}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{line.received_quantity}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{line.remaining_quantity}</td>
                        <td className="py-2 pl-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={line.remaining_quantity}
                            step="any"
                            disabled={done || saving}
                            value={done ? '' : value}
                            placeholder={done ? 'Completo' : undefined}
                            onChange={(e) => setQty((prev) => ({ ...prev, [id]: e.target.value }))}
                            className={`w-28 text-right rounded-md border px-2 py-1.5 bg-app-bg disabled:opacity-50 ${
                              invalid ? 'border-red-400 focus:border-red-500' : 'border-app-border'
                            }`}
                          />
                        </td>
                      </tr>
                      {showLot && (
                        <tr className="border-b border-app-border/60 last:border-0">
                          <td colSpan={5} className="pb-3 pt-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-app-subtle">
                              <span>Lote / vencimiento (opcional):</span>
                              <input
                                type="text"
                                placeholder="N° de lote"
                                disabled={saving}
                                value={lotInfo[id]?.lot_number ?? ''}
                                onChange={(e) =>
                                  setLotInfo((prev) => ({
                                    ...prev,
                                    [id]: { lot_number: e.target.value, expiry_date: prev[id]?.expiry_date ?? '' },
                                  }))
                                }
                                className="rounded-md border border-app-border px-2 py-1 bg-app-bg w-36"
                              />
                              <input
                                type="date"
                                disabled={saving}
                                value={lotInfo[id]?.expiry_date ?? ''}
                                onChange={(e) =>
                                  setLotInfo((prev) => ({
                                    ...prev,
                                    [id]: { lot_number: prev[id]?.lot_number ?? '', expiry_date: e.target.value },
                                  }))
                                }
                                className="rounded-md border border-app-border px-2 py-1 bg-app-bg"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {anyInvalid && (
          <p className="text-sm text-red-500">Hay cantidades inválidas (mayores al pendiente o negativas).</p>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            <PackageCheck className="w-4 h-4" />
            {saving ? 'Registrando entrada…' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
