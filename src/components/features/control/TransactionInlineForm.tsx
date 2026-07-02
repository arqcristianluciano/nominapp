import { useEffect, useState } from 'react'
import { todayISO } from '@/utils/dateLocal'
import { Plus } from 'lucide-react'
import type { BudgetCategory, BudgetItem, Supplier } from '@/types/database'
import { SupplierSelect } from '@/components/features/suppliers/SupplierSelect'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DOMINICAN_BANKS } from '@/constants/banks'
import type { Transaction } from '@/types/database'
import { budgetItemService } from '@/services/budgetItemService'
import { mul, round2 } from '@/utils/money'

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
  onSubmit: (data: Omit<Transaction, 'id' | 'created_at'>) => void
  saving: boolean
}) {
  const [date, setDate] = useState(todayISO())
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
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

  // Cargar las partidas del capítulo elegido. Si el capítulo tiene una sola
  // partida, se autoselecciona para fomentar la imputación a partida.
  useEffect(() => {
    let cancelled = false
    const promise = budgetCategoryId
      ? budgetItemService.getByCategoryId(budgetCategoryId)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (cancelled) return
        setBudgetItems(data)
        if (data.length === 1) setBudgetItemId((prev) => prev || data[0].id)
      })
      .catch(() => {
        if (!cancelled) setBudgetItems([])
      })
    return () => {
      cancelled = true
    }
  }, [budgetCategoryId])

  const total = round2(mul(quantity || 0, unitPrice || 0))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !description) return

    onSubmit({
      project_id: projectId,
      date,
      budget_category_id: budgetCategoryId || null,
      budget_item_id: budgetItemId || null,
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
      payroll_period_id: null,
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

  const inputClass =
    'w-full px-2 py-2 sm:py-1.5 border border-app-border rounded text-sm sm:text-xs bg-app-input-bg text-app-text placeholder:text-app-subtle [color-scheme:light] dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
  const selectClass =
    'w-full px-2 py-2 sm:py-1.5 border border-app-border rounded text-sm sm:text-xs bg-app-input-bg text-app-text [color-scheme:light] dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-[11px] sm:text-[10px] font-medium text-app-muted mb-1 sm:mb-0.5 block'

  return (
    <form onSubmit={handleSubmit} className="bg-app-surface border border-app-border rounded-lg p-3 shadow-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2">
        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Código</label>
          <select
            value={budgetCategoryId}
            onChange={(e) => {
              setBudgetCategoryId(e.target.value)
              setBudgetItemId('')
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {budgetCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Partida</label>
          <select
            value={budgetItemId}
            onChange={(e) => setBudgetItemId(e.target.value)}
            disabled={!budgetCategoryId}
            className={`${selectClass} disabled:opacity-50`}
            title={
              budgetCategoryId && !budgetItemId
                ? 'Asigna una partida para el seguimiento de costo por partida'
                : undefined
            }
          >
            <option value="">—</option>
            {budgetItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.code ? `[${it.code}] ` : ''}
                {it.description}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Descripción del gasto"
            required
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Proveedor</label>
          <SupplierSelect
            suppliers={suppliers}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="—"
            selectClassName={selectClass}
          />
        </div>
        <div>
          <label className={labelClass}>Cantidad</label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Precio</label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Total</label>
          <input type="number" value={total || ''} readOnly className={`${inputClass} bg-app-hover font-medium`} />
        </div>
        <div>
          <label className={labelClass}>Condición</label>
          <select
            value={paymentCondition}
            onChange={(e) => setPaymentCondition(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {PAYMENT_CONDITIONS.map((pc) => (
              <option key={pc.value} value={pc.value}>
                {pc.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Factura No.</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>No. Cheque</label>
          <input
            type="text"
            value={checkNumber}
            onChange={(e) => setCheckNumber(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Banco</label>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {DOMINICAN_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha canje</label>
          <input
            type="date"
            value={cashedDate}
            onChange={(e) => setCashedDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Notas</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={saving || !description}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 bg-blue-600 text-white text-sm sm:text-xs font-semibold sm:font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          {saving ? 'Guardando...' : 'Agregar transacción'}
        </button>
      </div>
    </form>
  )
}
