import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, BookOpen, AlertCircle } from 'lucide-react'
import { partidaService } from '@/services/cubicationService'
import { priceListService } from '@/services/priceListService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatRD } from '@/utils/currency'
import type { ContractPartida, ContractCorte, PriceListItem } from '@/types/database'

interface Props {
  contractId: string
  projectId: string
  partidas: ContractPartida[]
  cortes: ContractCorte[]
  onRefresh: () => void
}

interface FormState {
  description: string
  unit: string
  unit_price: string
  agreed_quantity: string
  budget_unit_price: number | null
}

const EMPTY_FORM: FormState = { description: '', unit: 'm²', unit_price: '', agreed_quantity: '', budget_unit_price: null }
const inputCls = 'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500'

export function PartidaSection({ contractId, projectId, partidas, cortes, onRefresh }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<ContractPartida | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [priceList, setPriceList] = useState<PriceListItem[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    priceListService.getByProject(projectId).then(setPriceList).catch(() => {})
  }, [projectId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredList = priceList.filter((item) =>
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    (item.code ?? '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8)

  function selectFromPriceList(item: PriceListItem) {
    setForm((f) => ({ ...f, description: item.description, unit: item.unit, unit_price: String(item.unit_price), budget_unit_price: item.unit_price }))
    setSearch(item.description)
    setShowDropdown(false)
  }

  function acumuladoForPartida(partidaId: string) {
    return cortes.filter((c) => c.partida_id === partidaId).reduce((s, c) => s + c.amount, 0)
  }

  function startEdit(p: ContractPartida) {
    setEditing(p)
    setForm({ description: p.description, unit: p.unit, unit_price: String(p.unit_price), agreed_quantity: String(p.agreed_quantity), budget_unit_price: null })
    setSearch(p.description)
    setShowAdd(false)
  }

  function cancelForm() {
    setEditing(null)
    setShowAdd(false)
    setForm(EMPTY_FORM)
    setSearch('')
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
      setForm(EMPTY_FORM)
      setSearch('')
      onRefresh()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await partidaService.delete(id)
    setDeleteId(null)
    onRefresh()
  }

  const priceDiff = form.budget_unit_price !== null && form.unit_price
    ? Number(form.unit_price) - form.budget_unit_price
    : null

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-app-muted">Las partidas y precios se toman del listado de precios del presupuesto.</p>
        <button
          onClick={() => { setShowAdd(true); setEditing(null) }}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> Partida
        </button>
      </div>

      {(showAdd || editing) && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-start">
            {/* Picker desde lista de precios */}
            <div className="col-span-5 relative" ref={dropdownRef}>
              <p className="text-[10px] text-app-muted mb-1">
                Descripción * <span className="text-blue-500">(selecciona del presupuesto)</span>
              </p>
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setForm((f) => ({ ...f, description: e.target.value, budget_unit_price: null })); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar en lista de precios..."
                  className={`${inputCls} w-full pr-7`}
                />
                <BookOpen className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-subtle" />
              </div>
              {showDropdown && filteredList.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-app-surface border border-app-border rounded-lg shadow-lg overflow-hidden">
                  {filteredList.map((item) => (
                    <button
                      key={item.id}
                      onMouseDown={() => selectFromPriceList(item)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-app-hover text-left"
                    >
                      <span className="text-app-text font-medium truncate">{item.description}</span>
                      <span className="ml-2 shrink-0 text-app-muted">{item.unit} · {formatRD(item.unit_price)}</span>
                    </button>
                  ))}
                  {priceList.length === 0 && (
                    <p className="px-3 py-2 text-xs text-app-muted">Sin ítems en la lista de precios del presupuesto.</p>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-1">
              <p className="text-[10px] text-app-muted mb-1">Unidad</p>
              <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={`${inputCls} w-full`} />
            </div>

            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Precio acordado (RD$)</p>
              <input
                type="number"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                placeholder="0"
                className={`${inputCls} w-full`}
              />
              {form.budget_unit_price !== null && (
                <p className="text-[10px] mt-0.5 text-app-muted">
                  Ppto: <span className="text-app-text font-medium">{formatRD(form.budget_unit_price)}</span>
                  {priceDiff !== null && priceDiff !== 0 && (
                    <span className={`ml-1 font-semibold ${priceDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      ({priceDiff > 0 ? '+' : ''}{formatRD(priceDiff)})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Cant. acordada</p>
              <input
                type="number"
                value={form.agreed_quantity}
                onChange={(e) => setForm((f) => ({ ...f, agreed_quantity: e.target.value }))}
                placeholder="0"
                className={`${inputCls} w-full`}
              />
            </div>

            <div className="col-span-2 flex gap-1 justify-end pt-4">
              <button onClick={cancelForm} className="px-2 py-1.5 text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? '...' : editing ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>

          {priceDiff !== null && Math.abs(priceDiff) > 0 && (
            <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${priceDiff > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/30' : 'bg-green-50 text-green-700 dark:bg-green-950/30'}`}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              Precio acordado {priceDiff > 0 ? 'superior' : 'inferior'} al presupuesto en {formatRD(Math.abs(priceDiff))} por {form.unit || 'unidad'}.
            </div>
          )}
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
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">P. Acordado</th>
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
                      <button onClick={() => setDeleteId(p.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar partida"
        message="¿Eliminar esta partida y todos sus cortes asociados? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
