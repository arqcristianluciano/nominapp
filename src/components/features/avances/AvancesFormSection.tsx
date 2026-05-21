import type { BudgetCategory, BudgetItem } from '@/types/database'

export interface AvancesFormState {
  budget_category_id: string
  budget_item_id: string
  cut_date: string
  executed_quantity: string
  executed_percent: string
  notes: string
}

const INPUT_CLASS =
  'w-full px-3 py-2 min-h-[44px] text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

interface AvancesFormSectionProps {
  form: AvancesFormState
  setForm: (form: AvancesFormState) => void
  categories: BudgetCategory[]
  items: BudgetItem[]
  saving: boolean
  onCancel: () => void
  onSave: () => void
}

export function AvancesFormSection({
  form,
  setForm,
  categories,
  items,
  saving,
  onCancel,
  onSave,
}: AvancesFormSectionProps) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Capítulo *</label>
          <select
            value={form.budget_category_id}
            onChange={(e) =>
              setForm({ ...form, budget_category_id: e.target.value, budget_item_id: '' })
            }
            className={INPUT_CLASS}
          >
            <option value="">Seleccionar…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Partida (opcional)</label>
          <select
            value={form.budget_item_id}
            onChange={(e) => setForm({ ...form, budget_item_id: e.target.value })}
            disabled={!form.budget_category_id}
            className={INPUT_CLASS}
          >
            <option value="">— Avance a nivel de capítulo —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.code ? `[${it.code}] ` : ''}
                {it.description}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Fecha de corte *</label>
          <input
            type="date"
            value={form.cut_date}
            onChange={(e) => setForm({ ...form, cut_date: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Cantidad ejecutada</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.executed_quantity}
            onChange={(e) =>
              setForm({ ...form, executed_quantity: e.target.value, executed_percent: '' })
            }
            placeholder="ej: 25"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">o % ejecutado</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={100}
            value={form.executed_percent}
            onChange={(e) =>
              setForm({ ...form, executed_percent: e.target.value, executed_quantity: '' })
            }
            placeholder="ej: 30"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-4">
          <label className="text-xs text-app-muted block mb-1">Observaciones</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Vaciado columnas eje 4..."
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 min-h-[44px] text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted w-full sm:w-auto"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={
            saving ||
            (!form.budget_category_id && !form.budget_item_id) ||
            (!form.executed_quantity && !form.executed_percent)
          }
          className="px-4 py-2 min-h-[44px] text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium w-full sm:w-auto"
        >
          {saving ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}
