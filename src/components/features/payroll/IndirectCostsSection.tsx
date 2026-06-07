import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import { TableScrollHint } from '@/components/ui/TableScrollHint'
import type { IndirectCost } from '@/types/database'

type ManualInput = { description: string; amount: number }

export function IndirectCostsSection({
  costs,
  isDraft,
  saving,
  total,
  onToggleActive,
  onAddManual,
  onUpdateManual,
  onDeleteManual,
}: {
  costs: IndirectCost[]
  isDraft: boolean
  saving: boolean
  total: number
  onToggleActive: (costId: string, isActive: boolean) => void
  onAddManual: (input: ManualInput) => void | Promise<void>
  onUpdateManual: (id: string, input: ManualInput) => void | Promise<void>
  onDeleteManual: (id: string) => void | Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')

  // En borrador siempre se muestra la sección (para poder agregar manuales);
  // en reportes ya comprometidos, solo si hay indirectos que mostrar.
  if (costs.length === 0 && !isDraft) return null

  const inputCls =
    'w-full px-2 py-1.5 bg-app-input-bg text-app-text border border-app-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'

  function resetAdd() {
    setAdding(false)
    setNewDesc('')
    setNewAmount('')
  }

  async function submitAdd() {
    const amount = Number(newAmount)
    if (!newDesc.trim() || !Number.isFinite(amount) || amount <= 0) return
    await onAddManual({ description: newDesc.trim(), amount })
    resetAdd()
  }

  function startEdit(cost: IndirectCost) {
    setEditingId(cost.id)
    setEditDesc(cost.description ?? '')
    setEditAmount(String(cost.calculated_amount))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDesc('')
    setEditAmount('')
  }

  async function submitEdit(id: string) {
    const amount = Number(editAmount)
    if (!editDesc.trim() || !Number.isFinite(amount) || amount <= 0) return
    await onUpdateManual(id, { description: editDesc.trim(), amount })
    cancelEdit()
  }

  return (
    <section>
      <h2 className="text-lg font-medium text-app-text mb-1">Gastos indirectos</h2>
      <p className="text-xs text-app-subtle mb-3">
        Desmarca los que no se aplican en este reporte. La preferencia se mantiene para los próximos.
      </p>
      {costs.length > 0 && (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <TableScrollHint />
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <tbody className="divide-y divide-app-border">
                {costs.map((cost) =>
                  editingId === cost.id ? (
                    <tr key={cost.id}>
                      <td className="px-4 py-2.5 w-10" />
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Concepto"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-app-muted">Fijo</td>
                      <td className="px-4 py-2.5 w-32">
                        <input
                          type="number"
                          step="any"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputCls} text-right`}
                        />
                      </td>
                      <td className="px-2 py-2.5 w-20 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void submitEdit(cost.id)}
                          disabled={saving}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="ml-2 text-app-muted hover:text-app-text align-middle"
                          aria-label="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={cost.id} className={cost.is_active ? '' : 'opacity-50'}>
                      <td className="px-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={cost.is_active}
                          disabled={!isDraft || saving}
                          onChange={(e) => onToggleActive(cost.id, e.target.checked)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className={`px-4 py-2.5 text-app-muted ${cost.is_active ? '' : 'line-through'}`}>
                        {cost.description}
                        {cost.is_manual && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-300">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-app-muted">
                        {cost.percentage ? `${cost.percentage}%` : 'Fijo'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-app-text w-32">
                        {formatRD(cost.calculated_amount)}
                      </td>
                      <td className="px-2 py-2.5 w-20 text-right whitespace-nowrap">
                        {cost.is_manual && isDraft && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(cost)}
                              disabled={saving}
                              className="text-app-muted hover:text-blue-600 disabled:opacity-50"
                              aria-label="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteManual(cost.id)}
                              disabled={saving}
                              className="ml-2 text-app-muted hover:text-red-600 disabled:opacity-50"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isDraft &&
        (adding ? (
          <div className="mt-3 p-3 border border-blue-500/40 bg-blue-500/5 rounded-lg flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Concepto (ej. Alquiler de grúa)"
              className={`${inputCls} sm:flex-1`}
            />
            <input
              type="number"
              step="any"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Monto RD$"
              className={`${inputCls} sm:w-40 text-right`}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => void submitAdd()}
                disabled={saving || !newDesc.trim() || Number(newAmount) <= 0}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={resetAdd}
                className="px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus size={16} /> Agregar indirecto manual
          </button>
        ))}

      <div className="mt-3 bg-purple-50 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-purple-900">Total indirectos</span>
        <span className="text-sm font-semibold text-purple-900">{formatRD(total)}</span>
      </div>
    </section>
  )
}
