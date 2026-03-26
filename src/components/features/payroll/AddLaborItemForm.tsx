import { useState } from 'react'
import { UserPlus, X, AlertTriangle } from 'lucide-react'
import type { Contractor, PriceListItem } from '@/types/database'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import { contractorService } from '@/services/contractorService'

const NEW_CONTRACTOR_VALUE = '__NEW__'

interface Props {
  contractors: Contractor[]
  laborTasks: PriceListItem[]
  onSubmit: (item: {
    contractor_id: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    is_advance: boolean
    is_advance_deduction: boolean
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
  onContractorCreated?: (contractor: Contractor) => void
}

export function AddLaborItemForm({ contractors, laborTasks, onSubmit, onCancel, saving, onContractorCreated }: Props) {
  const [contractorId, setContractorId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('M2')
  const [unitPrice, setUnitPrice] = useState('')
  const [isAdvance, setIsAdvance] = useState(false)
  const [isDeduction, setIsDeduction] = useState(false)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const selectedTask = laborTasks.find(t => t.id === selectedTaskId)

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
    const task = laborTasks.find(t => t.id === taskId)
    if (task) {
      setUnit(task.unit)
      setUnitPrice(String(task.unit_price))
    }
  }

  async function handleCreateContractor() {
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
    } finally {
      setSavingNew(false)
    }
  }

  function cancelNewForm() {
    setShowNewForm(false)
    setNewName('')
    setNewSpecialty('')
  }

  const subtotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showNewForm || !contractorId || !selectedTask || !quantity || !unitPrice) return
    await onSubmit({
      contractor_id: contractorId,
      description: selectedTask.description.toUpperCase(),
      quantity: isDeduction ? -(Math.abs(parseFloat(quantity))) : parseFloat(quantity),
      unit,
      unit_price: parseFloat(unitPrice),
      is_advance: isAdvance,
      is_advance_deduction: isDeduction,
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
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar contratista...</option>
          {contractors.filter(c => c.is_active).map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.specialty}</option>
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
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="Especialidad (ej: Plomería)"
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleCreateContractor}
              disabled={savingNew || !newName.trim()}
              className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              No hay tareas de mano de obra en la lista de precios de este proyecto.
              Agrégalas desde <strong>Presupuesto → Lista de precios</strong>.
            </span>
          </div>
        ) : (
          <select
            value={selectedTaskId}
            onChange={(e) => handleTaskSelect(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar tarea...</option>
            {laborTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.code ? `[${t.code}] ` : ''}{t.description}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Cantidad *</label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Unidad *</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MEASURE_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Precio unitario *</label>
          <input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdvance} onChange={() => { setIsAdvance(!isAdvance); setIsDeduction(false) }} className="rounded" />
          Avance a cuenta
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDeduction} onChange={() => { setIsDeduction(!isDeduction); setIsAdvance(false) }} className="rounded" />
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

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || showNewForm || !contractorId || !selectedTaskId || !quantity || !unitPrice}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Agregar partida'}
        </button>
      </div>
    </form>
  )
}
