import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { loanService } from '@/services/loanService'
import { getCortesByPayroll } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractorLoan, LoanDeduction } from '@/types/database'

interface Props {
  periodId: string
  isDraft: boolean
}

interface ActiveLoanOption {
  loan: ContractorLoan
  totalPaid: number
  balance: number
}

export function LoanDeductionSection({ periodId, isDraft }: Props) {
  const [deductions, setDeductions] = useState<LoanDeduction[]>([])
  const [activeLoans, setActiveLoans] = useState<ActiveLoanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedLoanId, setSelectedLoanId] = useState('')
  const [amount, setAmount] = useState('')

  const load = async () => {
    setLoading(true)
    const [ded, all, linkedCortes] = await Promise.all([
      loanService.getDeductionsByPeriod(periodId),
      loanService.getAll(),
      getCortesByPayroll(periodId),
    ])
    setDeductions(ded)

    const contractorIds = linkedCortes.length > 0
      ? new Set(linkedCortes.map((c) => (c.contract as any)?.contractor_id).filter(Boolean))
      : null

    const active = all.filter((l) =>
      l.status === 'active' &&
      (contractorIds === null || contractorIds.has(l.contractor_id))
    )
    const withBalance: ActiveLoanOption[] = await Promise.all(
      active.map(async (loan) => {
        const totalPaid = await loanService.getTotalPaid(loan.id)
        const totalOwed = loan.installment_amount * loan.installments
        return { loan, totalPaid, balance: Math.max(0, totalOwed - totalPaid) }
      })
    )
    setActiveLoans(withBalance.filter(o => o.balance > 0))
    setLoading(false)
  }

  useEffect(() => { load() }, [periodId])

  const handleAdd = async () => {
    if (!selectedLoanId || !amount) return
    const loan = activeLoans.find(o => o.loan.id === selectedLoanId)?.loan
    if (!loan) return
    setSaving(true)
    try {
      await loanService.addDeduction({
        loan_id: selectedLoanId,
        payroll_period_id: periodId,
        contractor_id: loan.contractor_id,
        amount: parseFloat(amount),
      })
      setShowAdd(false)
      setSelectedLoanId('')
      setAmount('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await loanService.deleteDeduction(id)
    await load()
  }

  const onLoanSelect = (loanId: string) => {
    setSelectedLoanId(loanId)
    const opt = activeLoans.find(o => o.loan.id === loanId)
    if (opt) setAmount(opt.loan.installment_amount.toFixed(2))
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)

  if (loading) return null
  if (!isDraft && deductions.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-app-text">Deducciones de préstamos</h2>
        {isDraft && activeLoans.length > 0 && (
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover">
            <Plus className="w-4 h-4" /> Agregar deducción
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Préstamo</label>
              <select
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text"
                value={selectedLoanId}
                onChange={e => onLoanSelect(e.target.value)}
              >
                <option value="">Seleccionar préstamo...</option>
                {activeLoans.map(({ loan, balance }) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.contractor?.name} — saldo {formatRD(balance)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Monto a descontar (RD$)</label>
              <input
                type="number" min="0.01" step="0.01"
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
            <button onClick={handleAdd} disabled={saving || !selectedLoanId || !amount} className="px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      )}

      {deductions.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-6 text-center text-sm text-app-subtle">
          No hay deducciones de préstamos en este reporte
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-2.5 font-medium text-app-muted">Contratista</th>
                <th className="text-right px-4 py-2.5 font-medium text-app-muted w-36">Monto descontado</th>
                {isDraft && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {deductions.map((d) => (
                <tr key={d.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5 text-app-text">{d.loan?.contractor?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">−{formatRD(d.amount)}</td>
                  {isDraft && (
                    <td className="px-2 py-2.5">
                      <button onClick={() => handleDelete(d.id)} className="p-1 text-app-subtle hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalDeductions > 0 && (
        <div className="mt-3 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-red-900 dark:text-red-300">Total deducciones préstamos</span>
          <span className="text-sm font-semibold text-red-900 dark:text-red-300">−{formatRD(totalDeductions)}</span>
        </div>
      )}
    </section>
  )
}
