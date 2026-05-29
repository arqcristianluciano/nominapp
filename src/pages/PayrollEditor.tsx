import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePayroll } from '@/hooks/usePayroll'
import { supplierService } from '@/services/supplierService'
import { contractorService } from '@/services/contractorService'
import { priceListService } from '@/services/priceListService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { useProjectRoles } from '@/hooks/useProjectRoles'
import { PaymentDistributionsSection } from '@/components/features/payments/PaymentDistributionsSection'
import { LoanDeductionSection } from '@/components/features/payroll/LoanDeductionSection'
import { CubicacionesPayrollSection } from '@/components/features/cubicacion/CubicacionesPayrollSection'
import {
  PayrollEditorHeader,
  PayrollEditorMobileActionBar,
  PayrollEditorModals,
} from '@/components/features/payroll/PayrollEditorSections'
import { PayrollTotalsCards } from '@/components/features/payroll/PayrollTotalsCards'
import { LaborItemsSection } from '@/components/features/payroll/LaborItemsSection'
import { MaterialInvoicesSection } from '@/components/features/payroll/MaterialInvoicesSection'
import { IndirectCostsSection } from '@/components/features/payroll/IndirectCostsSection'
import type { BudgetCategory, Contractor, PriceListItem, Supplier } from '@/types/database'

export default function PayrollEditor() {
  const { periodId } = useParams<{ periodId: string }>()
  const payroll = usePayroll(periodId)
  const loadPayroll = payroll.load
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [laborTasks, setLaborTasks] = useState<PriceListItem[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [showAddLabor, setShowAddLabor] = useState(false)
  const [showAddMaterial, setShowAddMaterial] = useState(false)

  useEffect(() => {
    loadPayroll()
    Promise.all([supplierService.getAll(), contractorService.getAll()]).then(([nextSuppliers, nextContractors]) => {
      setSuppliers(nextSuppliers)
      setContractors(nextContractors)
    })
  }, [loadPayroll])

  useEffect(() => {
    if (!payroll.period?.project_id) return
    const pid = payroll.period.project_id
    priceListService
      .getByProject(pid)
      .then((items) => setLaborTasks(items.filter((item) => item.category === 'labor')))
      .catch(() => setLaborTasks([]))
    budgetCategoryService
      .getByProject(pid)
      .then(setBudgetCategories)
      .catch(() => setBudgetCategories([]))
  }, [payroll.period?.project_id])

  const roles = useProjectRoles(payroll.period?.project_id)

  if (payroll.loading) return <div className="text-sm text-app-muted p-4">Cargando nómina...</div>
  if (!payroll.period) return <div className="text-sm text-app-muted p-4">Nómina no encontrada</div>

  const { period } = payroll
  const isDraft = period.status === 'draft'

  return (
    <div className="space-y-6 max-w-5xl pb-24 sm:pb-0">
      <PayrollEditorHeader
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        onUpdateStatus={payroll.updateStatus}
      />

      {payroll.error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{payroll.error}</div>}

      <PayrollTotalsCards
        labor={period.total_labor || 0}
        materials={period.total_materials || 0}
        indirect={period.total_indirect || 0}
        grandTotal={period.grand_total || 0}
      />

      <LaborItemsSection
        items={payroll.laborItems}
        isDraft={isDraft}
        total={period.total_labor || 0}
        budgetCategories={budgetCategories}
        onOpenAdd={() => setShowAddLabor(true)}
        onDelete={payroll.deleteLaborItem}
        onUpdateImputation={(itemId, budgetCategoryId) =>
          payroll.updateLaborItem(itemId, { budget_category_id: budgetCategoryId })
        }
      />
      <MaterialInvoicesSection
        invoices={payroll.materialInvoices}
        isDraft={isDraft}
        total={period.total_materials || 0}
        budgetCategories={budgetCategories}
        onOpenAdd={() => setShowAddMaterial(true)}
        onDelete={payroll.deleteMaterialInvoice}
        onUpdateImputation={(invoiceId, budgetCategoryId) =>
          payroll.updateMaterialInvoice(invoiceId, { budget_category_id: budgetCategoryId })
        }
      />
      <IndirectCostsSection
        costs={payroll.indirectCosts}
        isDraft={isDraft}
        saving={payroll.saving}
        total={period.total_indirect || 0}
        onToggleActive={payroll.setIndirectActive}
      />

      <CubicacionesPayrollSection
        periodId={period.id}
        projectId={period.project_id}
        isDraft={isDraft}
        onCorteLinked={payroll.load}
        onRecalculateTotals={payroll.recalculateTotals}
      />

      <LoanDeductionSection periodId={period.id} isDraft={isDraft} />

      {(period.status === 'approved' || period.status === 'paid') && (
        <PaymentDistributionsSection periodId={period.id} grandTotal={period.grand_total || 0} />
      )}

      <PayrollEditorModals
        showAddMaterial={showAddMaterial}
        showAddLabor={showAddLabor}
        suppliers={suppliers}
        contractors={contractors}
        laborTasks={laborTasks}
        budgetCategories={budgetCategories}
        saving={payroll.saving}
        onCloseAddMaterial={() => setShowAddMaterial(false)}
        onCloseAddLabor={() => setShowAddLabor(false)}
        onAddMaterial={async (invoice) => {
          await payroll.addMaterialInvoice(invoice)
          setShowAddMaterial(false)
        }}
        onAddLabor={async (item) => {
          await payroll.addLaborItem(item)
          setShowAddLabor(false)
        }}
        onContractorCreated={(contractor) => setContractors((prev) => [contractor, ...prev])}
      />

      <PayrollEditorMobileActionBar
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        onUpdateStatus={payroll.updateStatus}
      />
    </div>
  )
}
