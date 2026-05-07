import { ChequesEfectivoView } from '@/components/features/control/ChequesEfectivoView'
import { ControlFinancieroCxpNotice } from '@/components/features/control/ControlFinancieroSections'
import { CxPView } from '@/components/features/control/CxPView'
import { DiarioTab } from '@/components/features/control/DiarioTab'
import type { useControlFinancieroState } from '@/hooks/useControlFinancieroState'
import type { useTransactions } from '@/hooks/useTransactions'

type TransactionsState = ReturnType<typeof useTransactions>
type ControlState = ReturnType<typeof useControlFinancieroState>

interface ControlFinancieroTabContentProps {
  projectId: string
  txns: TransactionsState
  controlState: ControlState
}

export function ControlFinancieroTabContent({
  projectId,
  txns,
  controlState,
}: ControlFinancieroTabContentProps) {
  if (controlState.activeTab === 'diario') {
    return (
      <DiarioTab
        projectId={projectId}
        txns={txns}
        showAddForm={controlState.showAddForm}
        showFilter={controlState.showFilter}
        filterFrom={controlState.filterFrom}
        filterTo={controlState.filterTo}
        page={controlState.page}
        pageSize={controlState.pageSize}
        pagedTransactions={controlState.pagedTransactions}
        totalPages={controlState.totalPages}
        onToggleAdd={controlState.toggleAddForm}
        onToggleFilter={controlState.toggleFilter}
        onFilterFrom={controlState.setFilterFrom}
        onFilterTo={controlState.setFilterTo}
        onApplyFilter={controlState.handleApplyFilter}
        onClearFilter={controlState.handleClearFilter}
        onPage={controlState.changePage}
        isCurrentMonth={controlState.isCurrentMonth}
      />
    )
  }

  if (controlState.activeTab === 'cxp') {
    return (
      <div className="space-y-3">
        <ControlFinancieroCxpNotice projectId={projectId} />
        <CxPView transactions={txns.transactions} />
      </div>
    )
  }

  return (
    <ChequesEfectivoView
      transactions={txns.transactions}
      transitos={txns.transitos}
      cashDisponible={txns.cashDisponible}
    />
  )
}
