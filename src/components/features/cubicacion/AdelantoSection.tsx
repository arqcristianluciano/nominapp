import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { adelantoService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractAdelanto } from '@/types/database'

interface Props {
  contractId: string
  adelantos: ContractAdelanto[]
  onRefresh: () => void
}

const emptyForm = { advance_date: '', amount: '', description: '' }

export function AdelantoSection({ contractId, adelantos, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const total = adelantos.reduce((s, a) => s + a.amount, 0)

  async function handleCreate() {
    if (!form.advance_date || !form.amount) return
    setSaving(true)
    try {
      await adelantoService.create({
        contract_id: contractId,
        advance_date: form.advance_date,
        amount: Number(form.amount),
        description: form.description || null,
      })
      setForm(emptyForm)
      setShowAdd(false)
      onRefresh()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este adelanto?')) return
    await adelantoService.delete(id)
    onRefresh()
  }

  const inputCls = 'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-app-muted">
          Pagos parciales entregados antes de un corte formal.
          {total > 0 && <strong className="text-app-text ml-2">Total: {formatRD(total)}</strong>}
        </p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Adelanto
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3">
            <p className="text-[10px] text-app-muted mb-1">Fecha *</p>
            <input type="date" value={form.advance_date} onChange={(e) => setForm({ ...form, advance_date: e.target.value })} className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-3">
            <p className="text-[10px] text-app-muted mb-1">Monto (RD$) *</p>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-4">
            <p className="text-[10px] text-app-muted mb-1">Descripción</p>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Adelanto para materiales..." className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-2 flex gap-1 justify-end">
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="px-2 py-1.5 text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {adelantos.length === 0 && !showAdd ? (
        <p className="text-sm text-app-muted py-4 text-center">No hay adelantos registrados.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-app-border">
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Descripción</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Monto</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {adelantos.map((a) => (
              <tr key={a.id} className="hover:bg-app-hover">
                <td className="py-2.5 text-app-text">{new Date(a.advance_date).toLocaleDateString('es-DO')}</td>
                <td className="py-2.5 text-app-muted">{a.description || '—'}</td>
                <td className="py-2.5 text-right font-medium text-amber-700">{formatRD(a.amount)}</td>
                <td className="py-2.5">
                  <button onClick={() => handleDelete(a.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
            {adelantos.length > 1 && (
              <tr className="bg-app-bg">
                <td colSpan={2} className="py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Total adelantos</td>
                <td className="py-2 text-right font-bold text-amber-700">{formatRD(total)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
