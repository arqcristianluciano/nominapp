import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { TransactionWithRelations } from '@/services/transactionService'
import type { BudgetCategory, Supplier } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DOMINICAN_BANKS } from '@/constants/banks'
import { formatRD } from '@/utils/currency'

export function TransactionRow({
  transaction,
  budgetCategories,
  suppliers,
  onUpdate,
  onDelete,
  isCurrentMonth,
}: {
  transaction: TransactionWithRelations
  budgetCategories: BudgetCategory[]
  suppliers: Supplier[]
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  isCurrentMonth: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(transaction.date)
  const [budgetCategoryId, setBudgetCategoryId] = useState(transaction.budget_category_id || '')
  const [description, setDescription] = useState(transaction.description)
  const [supplierId, setSupplierId] = useState(transaction.supplier_id || '')
  const [quantity, setQuantity] = useState(transaction.quantity ?? '')
  const [unitPrice, setUnitPrice] = useState(transaction.unit_price ?? '')
  const [paymentCondition, setPaymentCondition] = useState(transaction.payment_condition || '')
  const [invoiceNumber, setInvoiceNumber] = useState(transaction.invoice_number || '')
  const [checkNumber, setCheckNumber] = useState(transaction.check_number || '')
  const [bank, setBank] = useState(transaction.bank || '')
  const [cashedDate, setCashedDate] = useState(transaction.cashed_date || '')
  const [notes, setNotes] = useState(transaction.notes || '')

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  const handleSave = () => {
    onUpdate(transaction.id, {
      date,
      budget_category_id: budgetCategoryId || null,
      description: description.toUpperCase(),
      supplier_id: supplierId || null,
      quantity: quantity === '' ? null : Number(quantity),
      unit_price: unitPrice === '' ? null : Number(unitPrice),
      total: total || transaction.total,
      payment_condition: paymentCondition || null,
      invoice_number: invoiceNumber || null,
      check_number: checkNumber || null,
      bank: bank || null,
      cashed_date: cashedDate || null,
      notes: notes || null,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setDate(transaction.date)
    setBudgetCategoryId(transaction.budget_category_id || '')
    setDescription(transaction.description)
    setSupplierId(transaction.supplier_id || '')
    setQuantity(transaction.quantity ?? '')
    setUnitPrice(transaction.unit_price ?? '')
    setPaymentCondition(transaction.payment_condition || '')
    setInvoiceNumber(transaction.invoice_number || '')
    setCheckNumber(transaction.check_number || '')
    setBank(transaction.bank || '')
    setCashedDate(transaction.cashed_date || '')
    setNotes(transaction.notes || '')
    setEditing(false)
  }

  const inputClass = 'w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500'
  const selectClass = 'w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white'
  const rowBg = isCurrentMonth ? 'bg-yellow-50' : 'bg-white'

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-2 py-1.5"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></td>
        <td className="px-2 py-1.5">
          <select value={budgetCategoryId} onChange={(e) => setBudgetCategoryId(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5"><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></td>
        <td className="px-2 py-1.5">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5"><input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} className={inputClass} /></td>
        <td className="px-2 py-1.5"><input type="number" step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value ? Number(e.target.value) : '')} className={inputClass} /></td>
        <td className="px-2 py-1.5 text-xs font-medium text-right">{formatRD(total)}</td>
        <td className="px-2 py-1.5">
          <select value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {PAYMENT_CONDITIONS.map((pc) => <option key={pc.value} value={pc.value}>{pc.label}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5"><input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputClass} /></td>
        <td className="px-2 py-1.5"><input type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className={inputClass} /></td>
        <td className="px-2 py-1.5">
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {DOMINICAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5"><input type="date" value={cashedDate} onChange={(e) => setCashedDate(e.target.value)} className={inputClass} /></td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={handleCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`${rowBg} hover:bg-gray-50 border-b border-gray-100`}>
      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{new Date(transaction.date).toLocaleDateString('es-DO')}</td>
      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{transaction.budget_category?.code?.split(' - ')[0] || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-900 font-medium">{transaction.description}</td>
      <td className="px-2 py-2 text-xs text-gray-600">{transaction.supplier?.name || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-600 text-right">{transaction.quantity ?? ''}</td>
      <td className="px-2 py-2 text-xs text-gray-600 text-right">{transaction.unit_price != null ? formatRD(transaction.unit_price) : ''}</td>
      <td className="px-2 py-2 text-xs text-gray-900 font-medium text-right">{formatRD(transaction.total)}</td>
      <td className="px-2 py-2 text-xs text-gray-500">{transaction.payment_condition || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-500">{transaction.invoice_number || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-500">{transaction.check_number || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-500 hidden lg:table-cell">{transaction.bank || ''}</td>
      <td className="px-2 py-2 text-xs text-gray-500 hidden lg:table-cell">{transaction.cashed_date ? new Date(transaction.cashed_date).toLocaleDateString('es-DO') : ''}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(transaction.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}
