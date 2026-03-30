import { useEffect, useState } from 'react'
import { Plus, CheckCircle, XCircle, Banknote } from 'lucide-react'
import { loanService, calcInstallmentAmount } from '@/services/loanService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatRD } from '@/utils/currency'
import type { ContractorLoan } from '@/types/database'

interface Props {
  contractorId: string
}

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-app-chip text-app-muted',
}

const emptyForm = { principal: '', interest_rate: '5', installments: '6', disbursed_date: new Date().toISOString().slice(0, 10), notes: '' }

export function PrestamoSection({ contractorId }: Props) {
  const [loans, setLoans] = useState<ContractorLoan[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)

  async function load() {
    const data = await loanService.getByContractor(contractorId)
    setLoans(data)
    const paid: Record<string, number> = {}
    await Promise.all(data.map(async (l) => { paid[l.id] = await loanService.getTotalPaid(l.id) }))
    setPaidMap(paid)
  }

  useEffect(() => { load() }, [contractorId])

  async function handleCreate() {
    if (!form.principal || !form.disbursed_date) return
    setSaving(true)
    try {
      await loanService.create({
        contractor_id: contractorId,
        principal: Number(form.principal),
        interest_rate: Number(form.interest_rate),
        installments: Number(form.installments),
        disbursed_date: form.disbursed_date,
        notes: form.notes || undefined,
      })
      setForm(emptyForm)
      setShowAdd(false)
      load()
    } finally { setSaving(false) }
  }

  async function handleMarkPaid(id: string) {
    await loanService.updateStatus(id, 'paid')
    load()
  }

  async function handleCancel(id: string) {
    await loanService.updateStatus(id, 'cancelled')
    setCancelId(null)
    load()
  }

  const principal = Number(form.principal)
  const installments = Number(form.installments)
  const interestRate = Number(form.interest_rate)
  const preview = principal > 0 && installments > 0 ? calcInstallmentAmount(principal, interestRate, installments) : 0

  const inputCls = 'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500 w-full'

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-app-muted">Préstamos otorgados a este contratista.</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Préstamo
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <p className="text-[10px] text-app-muted mb-1">Monto (RD$) *</p>
              <input type="number" min="1" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} placeholder="0" className={inputCls} />
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Interés (%)</p>
              <input type="number" min="0" max="100" step="0.1" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Cuotas</p>
              <input type="number" min="1" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-3">
              <p className="text-[10px] text-app-muted mb-1">Fecha desembolso *</p>
              <input type="date" value={form.disbursed_date} onChange={(e) => setForm({ ...form, disbursed_date: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2 flex gap-1 items-end justify-end">
              <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="px-2 py-1.5 text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.principal} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? '...' : 'Agregar'}
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-app-muted mb-1">Notas (opcional)</p>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Motivo, referencia u observación..."
              className={inputCls}
            />
          </div>
          {preview > 0 && (
            <p className="text-[10px] text-blue-600 dark:text-blue-400">
              Cuota estimada: <strong>{formatRD(preview)}</strong> · Total: <strong>{formatRD(preview * installments)}</strong>
            </p>
          )}
        </div>
      )}

      {loans.length === 0 && !showAdd ? (
        <div className="py-8 text-center">
          <Banknote className="w-7 h-7 text-app-subtle mx-auto mb-2" />
          <p className="text-sm text-app-muted">No hay préstamos registrados.</p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-app-border">
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Capital</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Cuota</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pagado</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Saldo</th>
              <th className="pb-2 text-center text-[10px] font-semibold text-app-muted uppercase">Estado</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loans.map((loan) => {
              const paid = paidMap[loan.id] ?? 0
              const balance = Math.max(0, loan.installment_amount * loan.installments - paid)
              return (
                <tr key={loan.id} className="hover:bg-app-hover group">
                  <td className="py-2.5 text-app-muted">{new Date(loan.disbursed_date).toLocaleDateString('es-DO')}</td>
                  <td className="py-2.5 text-right text-app-text">{formatRD(loan.principal)}</td>
                  <td className="py-2.5 text-right font-medium text-app-text">{formatRD(loan.installment_amount)}</td>
                  <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400">{formatRD(paid)}</td>
                  <td className="py-2.5 text-right font-bold text-app-text">{formatRD(balance)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
                      {STATUS_LABEL[loan.status]}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {loan.status === 'active' && (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleMarkPaid(loan.id)} title="Marcar pagado" className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setCancelId(loan.id)} title="Cancelar" className="p-1 text-app-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <ConfirmModal
        open={!!cancelId}
        title="Cancelar préstamo"
        message="¿Cancelar este préstamo? El saldo pendiente quedará sin efecto."
        confirmLabel="Cancelar préstamo"
        variant="warning"
        onConfirm={() => cancelId && handleCancel(cancelId)}
        onCancel={() => setCancelId(null)}
      />
    </div>
  )
}
