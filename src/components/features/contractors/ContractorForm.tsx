import { useState } from 'react'
import type { Contractor } from '@/types/database'

interface Props {
  initial?: Contractor
  onSubmit: (data: {
    name: string
    specialty?: string
    cedula?: string
    phone?: string
    bank_account?: string
    bank_name?: string
    payment_method?: string
    notes?: string
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function ContractorForm({ initial, onSubmit, onCancel, saving }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [specialty, setSpecialty] = useState(initial?.specialty || '')
  const [cedula, setCedula] = useState(initial?.cedula || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [bankAccount, setBankAccount] = useState(initial?.bank_account || '')
  const [bankName, setBankName] = useState(initial?.bank_name || '')
  const [paymentMethod, setPaymentMethod] = useState<string>(initial?.payment_method || 'cash')
  const [notes, setNotes] = useState(initial?.notes || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit({
      name,
      specialty: specialty || undefined,
      cedula: cedula || undefined,
      phone: phone || undefined,
      bank_account: bankAccount || undefined,
      bank_name: bankName || undefined,
      payment_method: paymentMethod,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">Nombre *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Especialidad</label>
          <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: Acero de refuerzo" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Cédula</label>
          <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="XXX-XXXXXXX-X" className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Teléfono</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Método de pago</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="cash">Efectivo</option>
            <option value="check">Cheque</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Banco</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">No. de cuenta</label>
          <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">Notas</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted">Cancelar</button>
        <button type="submit" disabled={saving || !name} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear contratista'}
        </button>
      </div>
    </form>
  )
}
