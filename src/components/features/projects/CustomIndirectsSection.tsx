import type { CustomIndirect, CustomIndirectType } from '@/types/database'

interface Props {
  items: CustomIndirect[]
  onChange: (next: CustomIndirect[]) => void
}

const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

function newItem(): CustomIndirect {
  return {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    type: 'percent',
    value: 0,
  }
}

export function CustomIndirectsSection({ items, onChange }: Props) {
  function update(id: string, patch: Partial<CustomIndirect>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id))
  }

  function add() {
    onChange([...items, newItem()])
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) => update(it.id, { name: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Supervisión eléctrica"
                />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Tipo</label>
                <select
                  value={it.type}
                  onChange={(e) => update(it.id, { type: e.target.value as CustomIndirectType })}
                  className={inputClass}
                >
                  <option value="percent">%</option>
                  <option value="fixed">RD$</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Valor</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={it.type === 'percent' ? 100 : undefined}
                  value={it.value}
                  onChange={(e) => update(it.id, { value: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="w-full px-2 py-2 text-sm text-red-600 border border-app-border rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        + Agregar otro gasto indirecto
      </button>
    </div>
  )
}
