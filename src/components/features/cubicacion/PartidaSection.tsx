import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, BookOpen, AlertCircle } from 'lucide-react'
import { partidaService } from '@/services/cubicationService'
import { priceListService } from '@/services/priceListService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { parseDecimalInput } from '@/utils/decimalInput'
import { round2, sumBy } from '@/utils/money'
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

const EMPTY_FORM: FormState = {
  description: '',
  unit: 'm²',
  unit_price: '',
  agreed_quantity: '',
  budget_unit_price: null,
}
const inputCls =
  'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500'

interface PartidaDropdownProps {
  search: string
  filteredList: PriceListItem[]
  priceList: PriceListItem[]
  priceListError: boolean
  showDropdown: boolean
  onSearchChange: (value: string) => void
  onFocus: () => void
  onSelect: (item: PriceListItem) => void
  dropdownRef: React.RefObject<HTMLDivElement | null>
}

function PartidaDropdown({
  search,
  filteredList,
  priceList,
  priceListError,
  showDropdown,
  onSearchChange,
  onFocus,
  onSelect,
  dropdownRef,
}: PartidaDropdownProps) {
  return (
    <div className="sm:col-span-4 relative" ref={dropdownRef}>
      <p className="text-[10px] text-app-muted mb-1">
        Descripción * <span className="text-blue-500">(del presupuesto)</span>
      </p>
      <div className="relative">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          placeholder="Buscar en lista de precios..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="partida-dropdown-list"
          className={`${inputCls} w-full pr-8 min-h-[44px] sm:min-h-0 text-sm sm:text-xs`}
        />
        <BookOpen className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 text-app-subtle pointer-events-none" />
      </div>
      {priceListError && (
        <p className="flex items-center gap-1 text-[10px] text-red-600 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          No se pudo cargar la lista de precios.
        </p>
      )}
      {showDropdown && filteredList.length > 0 && (
        <div
          id="partida-dropdown-list"
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-app-surface border border-app-border rounded-lg shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          {filteredList.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(item)
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                onSelect(item)
              }}
              className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs hover:bg-app-hover active:bg-app-hover text-left min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              <span className="text-app-text font-medium truncate">{item.description}</span>
              <span className="shrink-0 text-app-muted text-xs">
                {item.unit} · {formatRD(item.unit_price)}
              </span>
            </button>
          ))}
          {priceList.length === 0 && (
            <p className="px-3 py-2 text-xs text-app-muted">Sin ítems en la lista de precios.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface PartidaFormFieldsProps {
  form: FormState
  saving: boolean
  editing: ContractPartida | null
  priceDiff: number | null
  search: string
  filteredList: PriceListItem[]
  priceList: PriceListItem[]
  priceListError: boolean
  showDropdown: boolean
  dropdownRef: React.RefObject<HTMLDivElement | null>
  onSearchChange: (value: string) => void
  onFocus: () => void
  onSelectPriceItem: (item: PriceListItem) => void
  onFormChange: (updater: (f: FormState) => FormState) => void
  onCancel: () => void
  onSave: () => void
}

function PartidaFormFields({
  form,
  saving,
  editing,
  priceDiff,
  search,
  filteredList,
  priceList,
  priceListError,
  showDropdown,
  dropdownRef,
  onSearchChange,
  onFocus,
  onSelectPriceItem,
  onFormChange,
  onCancel,
  onSave,
}: PartidaFormFieldsProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-end">
        <PartidaDropdown
          search={search}
          filteredList={filteredList}
          priceList={priceList}
          priceListError={priceListError}
          showDropdown={showDropdown}
          onSearchChange={onSearchChange}
          onFocus={onFocus}
          onSelect={onSelectPriceItem}
          dropdownRef={dropdownRef}
        />

        <div className="grid grid-cols-2 sm:contents gap-2">
          <div className="sm:col-span-1">
            <p className="text-[10px] text-app-muted mb-1">Unidad</p>
            <input
              value={form.unit}
              onChange={(e) => onFormChange((f) => ({ ...f, unit: e.target.value }))}
              className={`${inputCls} w-full min-h-[44px] sm:min-h-0 text-sm sm:text-xs`}
            />
          </div>

          {/* Precio presupuesto — fijo, solo lectura */}
          <div className="sm:col-span-2">
            <p className="text-[10px] text-app-muted mb-1">P. Presupuesto (RD$)</p>
            <input
              readOnly
              value={form.budget_unit_price !== null ? form.budget_unit_price : '—'}
              className={`${inputCls} w-full bg-app-chip text-app-muted cursor-not-allowed min-h-[44px] sm:min-h-0 text-sm sm:text-xs`}
              tabIndex={-1}
            />
          </div>

          {/* Precio acordado — editable */}
          <div className="sm:col-span-2">
            <p className="text-[10px] text-app-muted mb-1">
              P. Acordado (RD$)
              {priceDiff !== null && priceDiff !== 0 && (
                <span className={`ml-1 font-semibold ${priceDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {priceDiff > 0 ? '▲' : '▼'} {formatRD(Math.abs(priceDiff))}
                </span>
              )}
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={form.unit_price}
              onChange={(e) => onFormChange((f) => ({ ...f, unit_price: e.target.value }))}
              placeholder="0"
              className={`${inputCls} w-full ring-1 ring-blue-400 min-h-[44px] sm:min-h-0 text-sm sm:text-xs`}
            />
          </div>

          <div className="sm:col-span-1">
            <p className="text-[10px] text-app-muted mb-1">Cant. acordada</p>
            <input
              type="text"
              inputMode="decimal"
              value={form.agreed_quantity}
              onChange={(e) => onFormChange((f) => ({ ...f, agreed_quantity: e.target.value }))}
              placeholder="0"
              className={`${inputCls} w-full min-h-[44px] sm:min-h-0 text-sm sm:text-xs`}
            />
          </div>
        </div>

        <div className="sm:col-span-2 flex gap-2 justify-end pt-1 sm:pt-0">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-sm sm:text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.description || !form.unit_price || !form.agreed_quantity}
            aria-busy={saving}
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-sm sm:text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {saving ? '...' : editing ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>

      {priceDiff !== null && Math.abs(priceDiff) > 0 && (
        <div
          className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${priceDiff > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/30' : 'bg-green-50 text-green-700 dark:bg-green-950/30'}`}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          Precio acordado {priceDiff > 0 ? 'superior' : 'inferior'} al presupuesto en {formatRD(Math.abs(priceDiff))}{' '}
          por {form.unit || 'unidad'}.
        </div>
      )}
    </div>
  )
}

interface PartidasTableProps {
  partidas: ContractPartida[]
  acumuladoForPartida: (id: string) => number
  onEdit: (p: ContractPartida) => void
  onDelete: (id: string) => void
}

function PartidasTable({ partidas, acumuladoForPartida, onEdit, onDelete }: PartidasTableProps) {
  return (
    <>
      {/* Mobile: tarjetas verticales */}
      <div className="sm:hidden space-y-2">
        {partidas.map((p) => {
          const acordado = p.agreed_quantity * p.unit_price
          const acumulado = acumuladoForPartida(p.id)
          const pendiente = acordado - acumulado
          const pct = acordado > 0 ? Math.min((acumulado / acordado) * 100, 100) : 0
          return (
            <div key={p.id} className="border border-app-border rounded-lg p-3 bg-app-surface">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-app-text break-words">{p.description}</p>
                  <p className="text-xs text-app-muted mt-0.5">
                    {p.unit} · {formatRD(p.unit_price)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(p)}
                    aria-label="Editar partida"
                    title="Editar partida"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-app-subtle hover:text-blue-500 active:bg-app-hover rounded-md touch-manipulation"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    aria-label="Eliminar partida"
                    title="Eliminar partida"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-app-subtle hover:text-red-500 active:bg-app-hover rounded-md touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-app-muted">Acordado (A)</p>
                  <p className="font-medium text-app-text">{formatRD(acordado)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-app-muted">Acumulado (B)</p>
                  <p className="font-medium text-blue-700">{formatRD(acumulado)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-app-muted">Pendiente</p>
                  <p className={`font-semibold ${pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatRD(pendiente)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-app-chip rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-app-muted w-10 text-right">{pct.toFixed(0)}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop/tablet: tabla con scroll horizontal */}
      <div className="hidden sm:block overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-xs min-w-[640px]">
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
                  <td
                    className={`py-2.5 text-right font-semibold ${pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}
                  >
                    {formatRD(pendiente)}
                  </td>
                  <td className="py-2.5 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-10 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-app-muted w-8">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => onEdit(p)}
                        aria-label="Editar partida"
                        title="Editar partida"
                        className="p-1 text-app-subtle hover:text-blue-500"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        aria-label="Eliminar partida"
                        title="Eliminar partida"
                        className="p-1 text-app-subtle hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function PartidaSection({ contractId, projectId, partidas, cortes, onRefresh }: Props) {
  const { error: toastError } = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<ContractPartida | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [priceList, setPriceList] = useState<PriceListItem[]>([])
  const [priceListError, setPriceListError] = useState(false)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    priceListService
      .getByProject(projectId)
      .then((items) => {
        setPriceList(items)
        setPriceListError(false)
      })
      .catch((err) => {
        console.warn('[PartidaSection] price list load failed', err)
        setPriceListError(true)
      })
  }, [projectId])

  useEffect(() => {
    function handleClick(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [])

  const filteredList = priceList
    .filter(
      (item) =>
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        (item.code ?? '').toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 8)

  function selectFromPriceList(item: PriceListItem) {
    setForm((f) => ({
      ...f,
      description: item.description,
      unit: item.unit,
      unit_price: String(item.unit_price),
      budget_unit_price: item.unit_price,
    }))
    setSearch(item.description)
    setShowDropdown(false)
  }

  function acumuladoForPartida(partidaId: string) {
    return round2(
      sumBy(
        cortes.filter((c) => c.partida_id === partidaId && c.status !== 'draft'),
        (c) => c.amount,
      ),
    )
  }

  function startEdit(p: ContractPartida) {
    setEditing(p)
    setForm({
      description: p.description,
      unit: p.unit,
      unit_price: String(p.unit_price),
      agreed_quantity: String(p.agreed_quantity),
      budget_unit_price: null,
    })
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
    if (saving) return
    if (!form.description || !form.unit_price || !form.agreed_quantity) return
    const unitPrice = parseDecimalInput(form.unit_price)
    const agreedQty = parseDecimalInput(form.agreed_quantity)
    if (unitPrice === null || agreedQty === null) {
      toastError('Precio o cantidad inválidos. Ingresa un número válido.')
      return
    }
    setSaving(true)
    try {
      const data = {
        contract_id: contractId,
        description: form.description.toUpperCase(),
        unit: form.unit,
        unit_price: unitPrice,
        agreed_quantity: agreedQty,
        sort_order: editing ? editing.sort_order : partidas.reduce((max, p) => Math.max(max, p.sort_order), 0) + 1,
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
    } catch (err) {
      console.warn('[PartidaSection] handleSave failed', err)
      toastError('No se pudo guardar la partida. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await partidaService.delete(id)
      setDeleteId(null)
      onRefresh()
    } catch (err) {
      console.warn('[PartidaSection] handleDelete failed', err)
      toastError('No se pudo eliminar la partida. Inténtalo de nuevo.')
      setDeleteId(null)
    }
  }

  const parsedUnitPriceForDiff = form.unit_price ? parseDecimalInput(form.unit_price) : null
  const priceDiff =
    form.budget_unit_price !== null && parsedUnitPriceForDiff !== null
      ? parsedUnitPriceForDiff - form.budget_unit_price
      : null

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <p className="text-xs text-app-muted">
          Las partidas y precios se toman del listado de precios del presupuesto.
        </p>
        <button
          onClick={() => {
            setShowAdd(true)
            setEditing(null)
          }}
          className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-blue-600 text-white text-sm sm:text-xs font-medium rounded-lg hover:bg-blue-700 min-h-[44px] sm:min-h-0 w-full sm:w-auto touch-manipulation"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Partida
        </button>
      </div>

      {(showAdd || editing) && (
        <PartidaFormFields
          form={form}
          saving={saving}
          editing={editing}
          priceDiff={priceDiff}
          search={search}
          filteredList={filteredList}
          priceList={priceList}
          priceListError={priceListError}
          showDropdown={showDropdown}
          dropdownRef={dropdownRef}
          onSearchChange={(value) => {
            setSearch(value)
            setForm((f) => ({ ...f, description: value, budget_unit_price: null }))
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onSelectPriceItem={selectFromPriceList}
          onFormChange={setForm}
          onCancel={cancelForm}
          onSave={handleSave}
        />
      )}

      {partidas.length === 0 && !showAdd ? (
        <p className="text-sm text-app-muted py-4 text-center">No hay partidas. Agrega la primera.</p>
      ) : (
        <PartidasTable
          partidas={partidas}
          acumuladoForPartida={acumuladoForPartida}
          onEdit={startEdit}
          onDelete={(id) => setDeleteId(id)}
        />
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
