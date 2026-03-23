import { useState } from 'react'
import type { Contractor } from '@/types/database'
import { MEASURE_UNITS } from '@/constants/measureUnits'

interface Props {
  contractors: Contractor[]
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
}

export function AddLaborItemForm({ contractors, onSubmit, onCancel, saving }: Props) {
  const [contractorId, setContractorId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('M2')
  const [unitPrice, setUnitPrice] = useState('')
  const [isAdvance, setIsAdvance] = useState(false)
  const [isDeduction, setIsDeduction] = useState(false)

  const subtotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contractorId || !description || !quantity || !unitPrice) return
    await onSubmit({
      contractor_id: contractorId,
      description: description.toUpperCase(),
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
        <label className="block text-xs font-medium text-gray-700 mb-1">Contratista *</label>
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar contratista...</option>
          {contractors.filter(c => c.is_active).map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.specialty}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: ENVARILLADO DE LOSA NIVEL 2"
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad *</label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unidad *</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MEASURE_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Precio unitario *</label>
          <input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-gray-50 rounded-lg px-4 py-2 flex justify-between">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className={`text-sm font-semibold ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
            RD${(isDeduction ? -Math.abs(subtotal) : subtotal).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !contractorId || !description || !quantity || !unitPrice}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Agregar partida'}
        </button>
      </div>
    </form>
  )
}
