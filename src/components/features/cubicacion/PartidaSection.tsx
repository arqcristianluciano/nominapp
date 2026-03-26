import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { partidaService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractPartida, ContractCorte } from '@/types/database'

interface Props {
  contractId: string
  partidas: ContractPartida[]
  cortes: ContractCorte[]
  onRefresh: () => void
}

const UNITS = ['m²', 'm³', 'ml', 'und', 'PA', 'kg', 'ton', 'lt', 'saco', 'rollo']
const emptyForm = { description: '', unit: 'm²', unit_price: '', agreed_quantity: '' }

export function PartidaSection({ contractId, partidas, cortes, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<ContractPartida | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  function acumuladoForPartida(partidaId: string) {
    return cortes.filter((c) => c.partida_id === partidaId).reduce((s, c) => s + c.amount, 0)
  }

  function startEdit(p: ContractPartida) {
    setEditing(p)
    setForm({ description: p.description, unit: p.unit, unit_price: String(p.unit_price), agreed_quantity: String(p.agreed_quantity) })
    setShowAdd(false)
  }

  function cancelForm() {
    setEditing(null)
    setShowAdd(false)
    setForm(emptyForm)
  }

  async function handleSave() {
    if (!form.description || !form.unit_price || !form.agreed_quantity) return
    setSaving(true)
    try {
      const data = {
        contract_id: contractId,
        description: form.description.toUpperCase(),
        unit: form.unit,
        unit_price: Number(form.unit_price),
        agreed_quantity: Number(form.agreed_quantity),
        sort_order: editing ? editing.sort_order : partidas.length + 1,
      }
      if (editing) {
        await partidaService.update(editing.id, data)
        setEditing(null)
      } else {
        await partidaService.create(data)
        setShowAdd(false)
      }
      setForm(emptyForm)
      onRefresh()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta partida y todos sus cortes?')) return
    await partidaService.delete(id)
    onRefresh()
  }

  const inputCls = 'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-app-muted">Las partidas definen el precio unitario y cantidad acordada del contrato.</p>
        <button onClick={() => { setShowAdd(true); setEditing(null) }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Partida
        </button>
      </div>

      {(showAdd || editing) && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <p className="text-[10px] text-app-muted mb-1">Descripción *</p>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: MUROS DE MAMPOSTERÍA" className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-app-muted mb-1">Unidad</p>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={`${inputCls} w-full`}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-app-muted mb-1">Precio unit. (RD$)</p>
            <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="0" className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-app-muted mb-1">Cant. acordada</p>
            <input type="number" value={form.agreed_quantity} onChange={(e) => setForm({ ...form, agreed_quantity: e.target.value })} placeholder="0" className={`${inputCls} w-full`} />
          </div>
          <div className="col-span-2 flex gap-1 justify-end">
            <button onClick={cancelForm} className="px-2 py-1.5 text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : editing ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {partidas.length === 0 && !showAdd ? (
        <p className="text-sm text-app-muted py-4 text-center">No hay partidas. Agrega la primera.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-app-border">
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Partida</th>
              <th className="pb-2 text-center text-[10px] font-semibold text-app-muted uppercase">Unidad</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">P. Unit.</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Acordado (A)</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Acumulado (B)</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pendiente</th>
              <th className="pb-2 text-center text-[10px] font-semibold text-app-muted uppercase">%</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {partidas.map((p) => {
              const acordado = p.agreed_quantity * p.unit_price
              const acumulado = acumuladoForPartida(p.id)
              const pendiente = acordado - acumulado
              const pct = acordado > 0 ? Math.min((acumulado / acordado) * 100, 100) : 0
              return (
                <tr key={p.id} className="hover:bg-app-hover">
                  <td className="py-2.5 text-app-text font-medium">{p.description}</td>
                  <td className="py-2.5 text-center text-app-muted">{p.unit}</td>
                  <td className="py-2.5 text-right text-app-muted">{formatRD(p.unit_price)}</td>
                  <td className="py-2.5 text-right text-app-text font-medium">{formatRD(acordado)}</td>
                  <td className="py-2.5 text-right text-blue-700">{formatRD(acumulado)}</td>
                  <td className={`py-2.5 text-right font-semibold ${pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRD(pendiente)}</td>
                  <td className="py-2.5 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-10 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-app-muted w-8">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-0.5">
                      <button onClick={() => startEdit(p)} className="p-1 text-app-subtle hover:text-blue-500"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
