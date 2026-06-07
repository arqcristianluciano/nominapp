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
    bankAccounts,
    paidMap,
    installmentsMap,
    loading,
    saving,
    search,
    showForm,
    cancelTargetId,
    editLoan,
    activeLoans,
    otherLoans,
    setSearch,
    setShowForm,
    setCancelTargetId,
    setEditLoan,
    handleCreate,
    handleEdit,
    handleMarkPaid,
    handleCancel,
    hasPaidInstallments,
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
            installmentsMap={installmentsMap}
            onMarkPaid={handleMarkPaid}
            onCancel={(id) => setCancelTargetId(id)}
            onEdit={(loan) => setEditLoan(loan)}
            showActions
          />
          {otherLoans.length > 0 && (
            <LoanTable title="Historial" loans={otherLoans} paidMap={paidMap} installmentsMap={installmentsMap} />
          )}
        </>
      )}

      <LoansModals
        showForm={showForm}
        contractors={contractors}
        bankAccounts={bankAccounts}
        saving={saving}
        cancelTargetId={cancelTargetId}
        editLoan={editLoan}
        hasPaidInstallments={editLoan ? hasPaidInstallments(editLoan.id) : false}
        onCloseForm={() => setShowForm(false)}
        onSubmitForm={handleCreate}
        onSubmitEdit={(values) => (editLoan ? handleEdit(editLoan.id, values) : Promise.resolve())}
        onConfirmCancel={handleCancel}
        onCancelConfirm={() => setCancelTargetId(null)}
        onCloseEdit={() => setEditLoan(null)}
      />
    </div>
  )
}
