import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { BudgetCategory, Supplier } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DOMINICAN_BANKS } from '@/constants/banks'

export function TransactionInlineForm({
  projectId,
  budgetCategories,
  suppliers,
  onSubmit,
  saving,
}: {
  projectId: string
  budgetCategories: BudgetCategory[]
  suppliers: Supplier[]
  onSubmit: (data: any) => void
  saving: boolean
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [paymentCondition, setPaymentCondition] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [bank, setBank] = useState('')
  const [cashedDate, setCashedDate] = useState('')
  const [notes, setNotes] = useState('')

  const total = (quantity || 0) * (unitPrice || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !description) return

    onSubmit({
      project_id: projectId,
      date,
      budget_category_id: budgetCategoryId || null,
      description: description.toUpperCase(),
      supplier_id: supplierId || null,
      quantity: quantity || null,
      unit_price: unitPrice || null,
      total: total || 0,
      payment_condition: paymentCondition || null,
      invoice_number: invoiceNumber || null,
      check_number: checkNumber || null,
      bank: bank || null,
      cashed_date: cashedDate || null,
      notes: notes || null,
    })

    setDescription('')
    setSupplierId('')
    setQuantity('')
    setUnitPrice('')
    setPaymentCondition('')
    setInvoiceNumber('')
    setCheckNumber('')
    setBank('')
    setCashedDate('')
    setNotes('')
  }

  const inputClass = 'w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
  const selectClass = 'w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white'

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Código</label>
          <select value={budgetCategoryId} onChange={(e) => setBudgetCategoryId(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {budgetCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.code}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Descripción</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Descripción del gasto" required />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Proveedor</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {suppliers.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Cantidad</label>
          <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Precio</label>
          <input type="number" step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value ? Number(e.target.value) : '')} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Total</label>
          <input type="number" value={total || ''} readOnly className={`${inputClass} bg-gray-50 font-medium`} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Condición</label>
          <select value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {PAYMENT_CONDITIONS.map((pc) => (
              <option key={pc.value} value={pc.value}>{pc.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Factura No.</label>
          <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">No. Cheque</label>
          <input type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Banco</label>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {DOMINICAN_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Fecha canje</label>
          <input type="date" value={cashedDate} onChange={(e) => setCashedDate(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Notas</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={saving || !description}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? 'Guardando...' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
