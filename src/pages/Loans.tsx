import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Banknote, CheckCircle, XCircle } from 'lucide-react'
import { loanService } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { LoanForm } from '@/components/features/loans/LoanForm'
import { formatRD } from '@/utils/currency'
import type { ContractorLoan, Contractor } from '@/types/database'

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  paid: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  cancelled: 'bg-app-chip text-app-muted',
}

export default function Loans() {
  const [loans, setLoans] = useState<ContractorLoan[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [l, c] = await Promise.all([loanService.getAll(), contractorService.getAll()])
    setLoans(l)
    setContractors(c)
    const paid: Record<string, number> = {}
    await Promise.all(l.map(async (loan) => {
      paid[loan.id] = await loanService.getTotalPaid(loan.id)
    }))
    setPaidMap(paid)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (values: Parameters<typeof loanService.create>[0]) => {
    setSaving(true)
    setError(null)
    try {
      await loanService.create(values)
      setShowForm(false)
      await load()
    } catch {
      setError('Error al crear el préstamo')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    await loanService.updateStatus(id, 'paid')
    await load()
  }

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar este préstamo?')) return
    await loanService.updateStatus(id, 'cancelled')
    await load()
  }

  const activeLoans = loans.filter(l => l.status === 'active')
  const otherLoans = loans.filter(l => l.status !== 'active')

  if (loading) return <div className="text-sm text-app-muted p-4">Cargando préstamos...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Préstamos</h1>
          <p className="text-sm text-app-muted mt-0.5">Préstamos otorgados a contratistas, descontados en nómina</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo préstamo
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      <LoanTable
        title="Préstamos activos"
        loans={activeLoans}
        paidMap={paidMap}
        onMarkPaid={handleMarkPaid}
        onCancel={handleCancel}
        showActions
      />

      {otherLoans.length > 0 && (
        <LoanTable title="Historial" loans={otherLoans} paidMap={paidMap} />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo préstamo">
        <LoanForm
          contractors={contractors}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}

interface LoanTableProps {
  title: string
  loans: ContractorLoan[]
  paidMap: Record<string, number>
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  showActions?: boolean
}

function LoanTable({ title, loans, paidMap, onMarkPaid, onCancel, showActions }: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-medium text-app-text mb-3">{title}</h2>
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">
          No hay préstamos registrados
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-medium text-app-text mb-3">{title}</h2>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="text-left px-4 py-2.5 font-medium text-app-muted">Contratista</th>
              <th className="text-right px-4 py-2.5 font-medium text-app-muted">Capital</th>
              <th className="text-right px-4 py-2.5 font-medium text-app-muted">Tasa</th>
              <th className="text-right px-4 py-2.5 font-medium text-app-muted">Cuota</th>
              <th className="text-right px-4 py-2.5 font-medium text-app-muted">Pagado</th>
              <th className="text-right px-4 py-2.5 font-medium text-app-muted">Saldo</th>
              <th className="text-center px-4 py-2.5 font-medium text-app-muted">Estado</th>
              {showActions && <th className="w-24" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loans.map((loan) => {
              const paid = paidMap[loan.id] ?? 0
              const totalOwed = loan.installment_amount * loan.installments
              const balance = Math.max(0, totalOwed - paid)
              const contractorName = loan.contractor?.name ?? '—'
              return (
                <tr key={loan.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5">
                    <Link to={`/contratistas/${loan.contractor_id}`} className="font-medium text-app-text hover:text-blue-600">
                      {contractorName}
                    </Link>
                    {loan.notes && <p className="text-xs text-app-subtle">{loan.notes}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-app-muted">{formatRD(loan.principal)}</td>
                  <td className="px-4 py-2.5 text-right text-app-muted">{loan.interest_rate}%</td>
                  <td className="px-4 py-2.5 text-right text-app-text font-medium">{formatRD(loan.installment_amount)}</td>
                  <td className="px-4 py-2.5 text-right text-green-600">{formatRD(paid)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-app-text">{formatRD(balance)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLOR[loan.status]}`}>
                      {STATUS_LABEL[loan.status]}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onMarkPaid?.(loan.id)} title="Marcar pagado" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => onCancel?.(loan.id)} title="Cancelar" className="p-1.5 text-app-subtle hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
