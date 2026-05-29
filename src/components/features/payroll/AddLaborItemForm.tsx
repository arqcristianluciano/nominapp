import { useEffect, useState } from 'react'
import { UserPlus, X, AlertTriangle } from 'lucide-react'
import type { BudgetCategory, BudgetItem, Contractor, PriceListItem } from '@/types/database'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import { contractorService } from '@/services/contractorService'
import { budgetItemService } from '@/services/budgetItemService'
import { parseDecimalInput } from '@/utils/decimalInput'
import { mul, round2 } from '@/utils/money'

const NEW_CONTRACTOR_VALUE = '__NEW__'

interface Props {
  contractors: Contractor[]
  laborTasks: PriceListItem[]
  budgetCategories?: BudgetCategory[]
  onSubmit: (item: {
    contractor_id: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    is_advance: boolean
    is_advance_deduction: boolean
    budget_category_id?: string | null
    budget_item_id?: string | null
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
  onContractorCreated?: (contractor: Contractor) => void
}

export function AddLaborItemForm({
  contractors,
  laborTasks,
  budgetCategories = [],
  onSubmit,
  onCancel,
  saving,
  onContractorCreated,
}: Props) {
  const [contractorId, setContractorId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('M2')
  const [unitPrice, setUnitPrice] = useState('')
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [isAdvance, setIsAdvance] = useState(false)
  const [isDeduction, setIsDeduction] = useState(false)

  // Cargar las partidas del capítulo seleccionado para imputar la mano de
  // obra a una partida concreta del presupuesto.
  useEffect(() => {
    let cancelled = false
    const promise = budgetCategoryId
      ? budgetItemService.getByCategoryId(budgetCategoryId)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (!cancelled) setBudgetItems(data)
      })
      .catch(() => {
        if (!cancelled) setBudgetItems([])
      })
    return () => {
      cancelled = true
    }
  }, [budgetCategoryId])

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const selectedTask = laborTasks.find((t) => t.id === selectedTaskId)

  function handleSelectChange(value: string) {
    if (value === NEW_CONTRACTOR_VALUE) {
      setShowNewForm(true)
      setContractorId('')
    } else {
      setShowNewForm(false)
      setContractorId(value)
    }
  }

  function handleTaskSelect(taskId: string) {
    setSelectedTaskId(taskId)
    const task = laborTasks.find((t) => t.id === taskId)
    if (task) {
      setUnit(task.unit)
      setUnitPrice(String(task.unit_price))
    }
  }

  async function handleCreateContractor() {
    if (savingNew) return
    if (!newName.trim()) return
    setSavingNew(true)
    try {
      const created = await contractorService.create({
        name: newName.trim(),
        specialty: newSpecialty.trim() || undefined,
      })
      onContractorCreated?.(created)
      setContractorId(created.id)
      setShowNewForm(false)
      setNewName('')
      setNewSpecialty('')
    } catch (err) {
      console.warn('[AddLaborItemForm] handleCreateContractor failed', err)
    } finally {
      setSavingNew(false)
    }
  }

  function cancelNewForm() {
    setShowNewForm(false)
    setNewName('')
    setNewSpecialty('')
  }

  const subtotal = round2(mul(parseDecimalInput(quantity) ?? 0, parseDecimalInput(unitPrice) ?? 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (showNewForm || !contractorId || !selectedTask || !quantity || !unitPrice) return
    const qtyNum = parseDecimalInput(quantity)
    const priceNum = parseDecimalInput(unitPrice)
    if (qtyNum === null || priceNum === null) return
    await onSubmit({
      contractor_id: contractorId,
      description: selectedTask.description.toUpperCase(),
      quantity: isDeduction ? -Math.abs(qtyNum) : qtyNum,
      unit,
      unit_price: priceNum,
      is_advance: isAdvance,
      is_advance_deduction: isDeduction,
      budget_category_id: budgetCategoryId || null,
      budget_item_id: budgetItemId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Contratista *</label>
        <select
          value={showNewForm ? NEW_CONTRACTOR_VALUE : contractorId}
          onChange={(e) => handleSelectChange(e.target.value)}
          required={!showNewForm}
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
        >
          <option value="">Seleccionar contratista...</option>
          {contractors
            .filter((c) => c.is_active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.specialty}
              </option>
            ))}
          <option value={NEW_CONTRACTOR_VALUE}>＋ Crear nuevo contratista</option>
        </select>

        {showNewForm && (
          <div className="mt-2 p-3 border border-blue-500/40 bg-blue-500/5 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <UserPlus size={12} /> Nuevo contratista
              </span>
              <button type="button" onClick={cancelNewForm} className="text-app-muted hover:text-app-text">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre *"
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
            />
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="Especialidad (ej: Plomería)"
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
            />
            <button
              type="button"
              onClick={handleCreateContractor}
              disabled={savingNew || !newName.trim()}
              aria-busy={savingNew}
              className="w-full py-2 sm:py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
            >
              {savingNew ? 'Creando...' : 'Crear y seleccionar'}
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Tarea / Descripción *</label>
        {laborTasks.length === 0 ? (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              No hay tareas de mano de obra en la lista de precios de este proyecto. Agrégalas desde{' '}
              <strong>Presupuesto → Lista de precios</strong>.
            </span>
          </div>
        ) : (
          <select
            value={selectedTaskId}
            onChange={(e) => handleTaskSelect(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
          >
            <option value="">Seleccionar tarea...</option>
            {laborTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `[${t.code}] ` : ''}
                {t.description}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Cantidad *</label>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Unidad *</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
          >
            {MEASURE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-app-muted mb-1">Precio unitario *</label>
          <input
            type="text"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
          />
        </div>
      </div>

      {budgetCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1">Capítulo imputado (opcional)</label>
            <select
              value={budgetCategoryId}
              onChange={(e) => {
                setBudgetCategoryId(e.target.value)
                setBudgetItemId('')
              }}
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
            >
              <option value="">— Sin imputación específica —</option>
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1">Partida (opcional)</label>
            <select
              value={budgetItemId}
              onChange={(e) => setBudgetItemId(e.target.value)}
              disabled={!budgetCategoryId}
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:min-h-0 disabled:opacity-50"
            >
              <option value="">— Sin partida específica —</option>
              {budgetItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.code ? `[${it.code}] ` : ''}
                  {it.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label className="flex items-center gap-2 text-sm min-h-[44px] sm:min-h-0 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdvance}
            onChange={() => {
              setIsAdvance(!isAdvance)
              setIsDeduction(false)
            }}
            className="w-4 h-4 rounded"
          />
          Avance a cuenta
        </label>
        <label className="flex items-center gap-2 text-sm min-h-[44px] sm:min-h-0 cursor-pointer">
          <input
            type="checkbox"
            checked={isDeduction}
            onChange={() => {
              setIsDeduction(!isDeduction)
              setIsAdvance(false)
            }}
            className="w-4 h-4 rounded"
          />
          Deducción de avance anterior
        </label>
      </div>

      {subtotal !== 0 && (
        <div className="bg-app-bg rounded-lg px-4 py-2 flex justify-between">
          <span className="text-sm text-app-muted">Subtotal</span>
          <span className={`text-sm font-semibold ${isDeduction ? 'text-red-600' : 'text-app-text'}`}>
            RD${(isDeduction ? -Math.abs(subtotal) : subtotal).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-app-muted hover:text-app-text min-h-[44px] sm:min-h-0"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || showNewForm || !contractorId || !selectedTaskId || !quantity || !unitPrice}
          aria-busy={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
        >
          {saving ? 'Guardando...' : 'Agregar partida'}
        </button>
      </div>
    </form>
  )
}
