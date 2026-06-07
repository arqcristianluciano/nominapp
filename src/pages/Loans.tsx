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
                onMarkPaid={handleMarkPaid}
                onCancel={(id) => setCancelTargetId(id)}
                showActions
              />
              {otherLoans.length > 0 && <LoanTable title="Historial" loans={otherLoans} paidMap={paidMap} />}
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
