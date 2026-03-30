import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Banknote, CheckCircle, XCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { loanService, calcInstallmentAmount } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LoanForm } from '@/components/features/loans/LoanForm'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatRD } from '@/utils/currency'
import type { ContractorLoan, Contractor } from '@/types/database'

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-app-chip text-app-muted',
}

export default function Loans() {
  const [loans, setLoans] = useState<ContractorLoan[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const { success, error } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [l, c] = await Promise.all([loanService.getAll(), contractorService.getAll()])
      setLoans(l)
      setContractors(c)
      const paid: Record<string, number> = {}
      await Promise.all(l.map(async (loan) => { paid[loan.id] = await loanService.getTotalPaid(loan.id) }))
      setPaidMap(paid)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (values: Parameters<typeof loanService.create>[0]) => {
    setSaving(true)
    try {
      await loanService.create(values)
      setShowForm(false)
      await load()
      success('Préstamo creado correctamente')
    } catch { error('Error al crear el préstamo') }
    finally { setSaving(false) }
  }

  const handleMarkPaid = async (id: string) => {
    await loanService.updateStatus(id, 'paid')
    await load()
    success('Préstamo marcado como pagado')
  }

  const handleCancel = async (id: string) => {
    await loanService.updateStatus(id, 'cancelled')
    await load()
    setCancelTargetId(null)
  }

  const filtered = loans.filter((l) => {
    const term = search.toLowerCase()
    return !term || l.contractor?.name?.toLowerCase().includes(term) || l.notes?.toLowerCase().includes(term)
  })

  const activeLoans = filtered.filter((l) => l.status === 'active')
  const otherLoans = filtered.filter((l) => l.status !== 'active')

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Préstamos</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-app-muted">{loans.length} registrados</span>
            {activeLoans.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-full">
                {activeLoans.length} activos
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo préstamo
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input
          type="text"
          placeholder="Buscar por contratista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : (
        <>
          <LoanTable
            title="Préstamos activos"
            loans={activeLoans}
            paidMap={paidMap}
            onMarkPaid={handleMarkPaid}
            onCancel={(id) => setCancelTargetId(id)}
            showActions
          />
          {otherLoans.length > 0 && (
            <LoanTable title="Historial" loans={otherLoans} paidMap={paidMap} />
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo préstamo">
        <LoanForm
          contractors={contractors}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmModal
        open={!!cancelTargetId}
        title="Cancelar préstamo"
        message="¿Cancelar este préstamo? El saldo pendiente quedará sin efecto."
        confirmLabel="Cancelar préstamo"
        variant="warning"
        onConfirm={() => cancelTargetId && handleCancel(cancelTargetId)}
        onCancel={() => setCancelTargetId(null)}
      />
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

function AmortizationTable({ loan, paid }: { loan: ContractorLoan; paid: number }) {
  const totalOwed = loan.installment_amount * loan.installments
  const cuotasPagadas = Math.min(loan.installments, Math.floor(paid / loan.installment_amount))
  const rows = Array.from({ length: loan.installments }, (_, i) => {
    const cuota = i + 1
    const isPaid = cuota <= cuotasPagadas
    return { cuota, isPaid }
  })

  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-app-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Cuota</th>
              <th className="text-right px-3 py-2 font-semibold text-app-subtle uppercase">Monto</th>
              <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {rows.map(({ cuota, isPaid }) => (
              <tr key={cuota} className={isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'hover:bg-app-hover'}>
                <td className="text-center px-3 py-1.5 text-app-muted font-mono">#{cuota}</td>
                <td className="text-right px-3 py-1.5 font-medium text-app-text">{formatRD(loan.installment_amount)}</td>
                <td className="text-center px-3 py-1.5">
                  {isPaid
                    ? <span className="text-emerald-600 font-semibold">✓ Pagado</span>
                    : <span className="text-app-subtle">Pendiente</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-app-bg border-t border-app-border">
              <td className="px-3 py-2 text-app-muted font-semibold text-right" colSpan={2}>Total:</td>
              <td className="px-3 py-2 font-bold text-app-text text-right">{formatRD(totalOwed)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LoanRow({ loan, paid, onMarkPaid, onCancel, showActions }: {
  loan: ContractorLoan; paid: number; onMarkPaid?: (id: string) => void; onCancel?: (id: string) => void; showActions?: boolean
}) {
  const [showAmort, setShowAmort] = useState(false)
  const totalOwed = loan.installment_amount * loan.installments
  const balance = Math.max(0, totalOwed - paid)

  return (
    <>
      <tr className="hover:bg-app-hover transition-colors group">
        <td className="px-4 py-3.5">
          <div>
            <Link to={`/contratistas/${loan.contractor_id}`} className="font-semibold text-app-text hover:text-blue-600 transition-colors text-sm">
              {loan.contractor?.name ?? '—'}
            </Link>
            {loan.notes && <p className="text-[11px] text-app-subtle mt-0.5">{loan.notes}</p>}
          </div>
        </td>
        <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden sm:table-cell">{formatRD(loan.principal)}</td>
        <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden md:table-cell">{loan.interest_rate}%</td>
        <td className="px-4 py-3.5 text-right text-sm font-semibold text-app-text">{formatRD(loan.installment_amount)}</td>
        <td className="px-4 py-3.5 text-right text-sm text-emerald-600 dark:text-emerald-400 hidden sm:table-cell">{formatRD(paid)}</td>
        <td className="px-4 py-3.5 text-right text-sm font-bold text-app-text">{formatRD(balance)}</td>
        <td className="px-4 py-3.5 text-center">
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
            {STATUS_LABEL[loan.status]}
          </span>
        </td>
        <td className="px-2 py-3.5">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowAmort((v) => !v)}
              title="Ver amortización"
              className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              {showAmort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showActions && (
              <>
                <button onClick={() => onMarkPaid?.(loan.id)} title="Marcar pagado" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-all">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => onCancel?.(loan.id)} title="Cancelar" className="p-1.5 rounded-lg text-app-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all">
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {showAmort && (
        <tr>
          <td colSpan={8} className="bg-app-bg">
            <AmortizationTable loan={loan} paid={paid} />
          </td>
        </tr>
      )}
    </>
  )
}

function LoanTable({ title, loans, paidMap, onMarkPaid, onCancel, showActions }: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-app-text mb-3">{title}</h2>
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <Banknote className="w-8 h-8 text-app-subtle mx-auto mb-2" />
          <p className="text-sm text-app-muted">No hay préstamos registrados</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-app-text mb-3">{title}</h2>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Contratista</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Capital</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Tasa</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Cuota</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Pagado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Saldo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                paid={paidMap[loan.id] ?? 0}
                onMarkPaid={onMarkPaid}
                onCancel={onCancel}
                showActions={showActions}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
