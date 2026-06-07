import { useState } from 'react'
import { LoanTable } from '@/components/features/loans/LoanTable'
import { LoansHeader, LoansModals, LoansSearch } from '@/components/features/loans/LoansSections'
import { AccountMovementsPanel } from '@/components/features/loans/AccountMovementsPanel'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useLoansPage } from '@/hooks/useLoansPage'

type Tab = 'prestamos' | 'conciliacion'

export default function Loans() {
  const [activeTab, setActiveTab] = useState<Tab>('prestamos')
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

      {/* Barra de pestañas */}
      <div className="flex gap-0 border-b border-app-border">
        <button
          onClick={() => setActiveTab('prestamos')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'prestamos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          Préstamos
        </button>
        <button
          onClick={() => setActiveTab('conciliacion')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'conciliacion'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          Conciliación de cuentas
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'prestamos' && (
        <>
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
        </>
      )}

      {activeTab === 'conciliacion' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-app-muted">
              Aquí puedes ver todos los movimientos de dinero en cada cuenta bancaria — tanto las salidas por
              desembolsos de préstamos como las entradas por cobros de cuotas — y el saldo resultante.
            </p>
          </div>
          <AccountMovementsPanel />
        </div>
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
