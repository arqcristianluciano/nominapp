import { LoanTable } from '@/components/features/loans/LoanTable'
import { LoansHeader, LoansModals, LoansSearch } from '@/components/features/loans/LoansSections'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useLoansPage } from '@/hooks/useLoansPage'

export default function Loans() {
  const { success, error } = useToast()
  const {
    loans,
    contractors,
    paidMap,
    loading,
    saving,
    search,
    showForm,
    cancelTargetId,
    activeLoans,
    otherLoans,
    setSearch,
    setShowForm,
    setCancelTargetId,
    handleCreate,
    handleMarkPaid,
    handleCancel,
  } = useLoansPage({ success, error })

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
