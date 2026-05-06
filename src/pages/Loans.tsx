import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { loanService } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LoanForm } from '@/components/features/loans/LoanForm'
import { LoanTable } from '@/components/features/loans/LoanTable'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'
import type { ContractorLoan, Contractor } from '@/types/database'

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
