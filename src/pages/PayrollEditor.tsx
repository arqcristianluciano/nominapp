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
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { canEditPayrollItems, canReturnPayrollToDraft } from '@/utils/payrollItemPermissions'
import type {
  BudgetCategory,
  Contractor,
  LaborLineItem,
  MaterialInvoice,
  PriceListItem,
  Supplier,
} from '@/types/database'

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
  const [editLaborItem, setEditLaborItem] = useState<LaborLineItem | null>(null)
  const [editMaterialInvoice, setEditMaterialInvoice] = useState<MaterialInvoice | null>(null)
  const [confirmReturnToDraft, setConfirmReturnToDraft] = useState(false)

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
  // Opción A: en borrador edita quien tiene permiso de edición; en reportes ya
  // comprometidos (enviado/aprobado/pagado) solo la mayor jerarquía (Director).
  const canEditItems = canEditPayrollItems({
    isDraft,
    canEditDraft: roles.canEditPayrollDraft,
    canEditCommitted: roles.canApprovePayroll,
  })
  // Devolver a borrador: solo mayor jerarquía y solo desde enviado/aprobado.
  const canReturnToDraft = canReturnPayrollToDraft({
    status: period.status,
    canApprove: roles.canApprovePayroll,
  })

  return (
    <div className="space-y-6 max-w-5xl pb-24 sm:pb-0">
      <PayrollEditorHeader
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        canReturnToDraft={canReturnToDraft}
        onReturnToDraft={() => setConfirmReturnToDraft(true)}
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
        canEdit={canEditItems}
        total={period.total_labor || 0}
        budgetCategories={budgetCategories}
        onOpenAdd={() => setShowAddLabor(true)}
        onEdit={setEditLaborItem}
        onDelete={payroll.deleteLaborItem}
      />
      <MaterialInvoicesSection
        invoices={payroll.materialInvoices}
        isDraft={isDraft}
        canEdit={canEditItems}
        total={period.total_materials || 0}
        budgetCategories={budgetCategories}
        onOpenAdd={() => setShowAddMaterial(true)}
        onEdit={setEditMaterialInvoice}
        onDelete={payroll.deleteMaterialInvoice}
        onAttach={payroll.attachInvoiceFile}
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
        editLaborItem={editLaborItem}
        editMaterialInvoice={editMaterialInvoice}
        periodId={period.id}
        projectId={period.project_id}
        suppliers={suppliers}
        contractors={contractors}
        laborTasks={laborTasks}
        budgetCategories={budgetCategories}
        saving={payroll.saving}
        onCloseAddMaterial={() => setShowAddMaterial(false)}
        onCloseAddLabor={() => setShowAddLabor(false)}
        onCloseEditLabor={() => setEditLaborItem(null)}
        onCloseEditMaterial={() => setEditMaterialInvoice(null)}
        onAddMaterial={async (invoice) => {
          await payroll.addMaterialInvoice(invoice)
          setShowAddMaterial(false)
        }}
        onAddLabor={async (item) => {
          await payroll.addLaborItem(item)
          setShowAddLabor(false)
        }}
        onUpdateLabor={async (item) => {
          if (editLaborItem) {
            await payroll.updateLaborItem(editLaborItem.id, item)
            setEditLaborItem(null)
          }
        }}
        onUpdateMaterial={async (invoice) => {
          if (editMaterialInvoice) {
            await payroll.updateMaterialInvoice(editMaterialInvoice.id, invoice)
            setEditMaterialInvoice(null)
          }
        }}
        onContractorCreated={(contractor) => setContractors((prev) => [contractor, ...prev])}
      />

      <PayrollEditorMobileActionBar
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        canReturnToDraft={canReturnToDraft}
        onReturnToDraft={() => setConfirmReturnToDraft(true)}
        onUpdateStatus={payroll.updateStatus}
      />

      <ConfirmModal
        open={confirmReturnToDraft}
        variant="warning"
        title={`Devolver el Reporte No. ${period.period_number} a borrador`}
        message="Volverá a estado borrador para poder corregirlo. Se quitará la aprobación y la acción quedará registrada en la bitácora de aprobaciones."
        confirmLabel="Devolver a borrador"
        onConfirm={() => {
          void payroll.returnToDraft()
        }}
        onCancel={() => setConfirmReturnToDraft(false)}
      />
    </div>
  )
}
