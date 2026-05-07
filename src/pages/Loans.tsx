import { useEffect, useState } from 'react'
import { loanService } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import { LoanTable } from '@/components/features/loans/LoanTable'
import { LoansHeader, LoansModals, LoansSearch } from '@/components/features/loans/LoansSections'
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
      <LoansHeader totalLoans={loans.length} activeLoans={activeLoans.length} onCreate={() => setShowForm(true)} />
      <LoansSearch value={search} onChange={setSearch} />

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

      <LoansModals
        showForm={showForm}
        contractors={contractors}
        saving={saving}
        cancelTargetId={cancelTargetId}
        onCloseForm={() => setShowForm(false)}
        onSubmitForm={handleCreate}
        onConfirmCancel={handleCancel}
        onCancelConfirm={() => setCancelTargetId(null)}
      />
    </div>
  )
}
