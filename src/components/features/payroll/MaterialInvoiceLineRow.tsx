import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import type { PriceListItem } from '@/types/database'
import { formatRD } from '@/utils/currency'

export interface MaterialLine {
  description: string
  amount: string
  price_list_item_id?: string | null
}

interface Props {
  line: MaterialLine
  priceListMaterials: PriceListItem[]
  onChange: (line: MaterialLine) => void
  onRemove: () => void
  canRemove: boolean
}

export function MaterialInvoiceLineRow({ line, priceListMaterials, onChange, onRemove, canRemove }: Props) {
  const [query, setQuery] = useState('')
  const [showList, setShowList] = useState(false)

  const filtered = query
    ? priceListMaterials.filter((p) => p.description.toLowerCase().includes(query.toLowerCase()))
    : []

  function applyPrice(item: PriceListItem) {
    onChange({
      description: item.description,
      amount: line.amount || String(item.unit_price),
      price_list_item_id: item.id,
    })
    setShowList(false)
    setQuery('')
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-7 relative">
        {priceListMaterials.length > 0 && (
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-app-subtle" />
            <input
              type="text"
              placeholder="Buscar en lista de precios..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowList(true) }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              className="w-full pl-7 pr-2 py-1 bg-app-input-bg text-app-text border border-app-border rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {showList && filtered.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-app-surface border border-app-border rounded shadow-lg max-h-40 overflow-y-auto">
                {filtered.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyPrice(p) }}
                    className="w-full text-left px-2 py-1 hover:bg-blue-50 border-b border-app-border last:border-0"
                  >
                    <p className="text-[11px] font-medium text-app-text">{p.description}</p>
                    <p className="text-[10px] text-app-muted">{p.unit} · {formatRD(p.unit_price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          value={line.description}
          onChange={(e) => onChange({ ...line, description: e.target.value })}
          placeholder="Descripción del material *"
          className="w-full px-2 py-1.5 bg-app-input-bg text-app-text border border-app-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-4">
        <input
          type="number"
          step="0.01"
          value={line.amount}
          onChange={(e) => onChange({ ...line, amount: e.target.value })}
          placeholder="Monto RD$ *"
          className="w-full px-2 py-1.5 bg-app-input-bg text-app-text border border-app-border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-1 flex justify-end pt-1">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1 text-app-subtle hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Quitar línea"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
