import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePayroll } from '@/hooks/usePayroll'
import { supplierService } from '@/services/supplierService'
import { contractorService } from '@/services/contractorService'
import { priceListService } from '@/services/priceListService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { paymentDistributionService } from '@/services/paymentDistributionService'
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
import { PayrollHistorySection } from '@/components/features/payroll/PayrollHistorySection'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { canEditPayrollItems, canReturnPayrollToDraft } from '@/utils/payrollItemPermissions'
import { formatRD } from '@/utils/currency'
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
  // Aviso (no bloqueante) al enviar a aprobación si aún falta repartir dinero.
  const [submitWarning, setSubmitWarning] = useState<{ remaining: number } | null>(null)

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

  // Al enviar a aprobación, si aún falta repartir parte del total, se avisa sin
  // bloquear: el usuario puede enviar igual y terminar la distribución luego.
  const grandTotal = period.grand_total || 0
  const handleUpdateStatus = async (status: 'submitted' | 'approved' | 'paid') => {
    if (status === 'submitted' && grandTotal > 0) {
      try {
        const distributions = await paymentDistributionService.getByPeriod(period.id)
        const distributed = distributions.reduce((sum, d) => sum + d.amount, 0)
        const remaining = grandTotal - distributed
        if (remaining > 0.01) {
          setSubmitWarning({ remaining })
          return
        }
      } catch {
        // Si la consulta falla, no se bloquea el envío.
      }
    }
    await payroll.updateStatus(status)
  }

  return (
    <div className="space-y-6 max-w-5xl pb-24 sm:pb-0">
      <PayrollEditorHeader
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        canReturnToDraft={canReturnToDraft}
        onReturnToDraft={() => setConfirmReturnToDraft(true)}
        onUpdateStatus={handleUpdateStatus}
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
        onAddManual={payroll.addManualIndirect}
        onUpdateManual={payroll.updateManualIndirect}
        onDeleteManual={payroll.deleteManualIndirect}
      />

      <CubicacionesPayrollSection
        periodId={period.id}
        projectId={period.project_id}
        isDraft={isDraft}
        onCorteLinked={payroll.load}
        onRecalculateTotals={payroll.recalculateTotals}
      />

      <LoanDeductionSection periodId={period.id} isDraft={isDraft} />

      <PayrollHistorySection periodId={period.id} />

      {/* La distribución de pagos se puede preparar ANTES de aprobar: aparece en
          cuanto el reporte tiene un total que repartir, y se conserva al aprobar
          (las distribuciones se guardan por reporte, no dependen del estado). */}
      {(grandTotal > 0 || period.status === 'approved' || period.status === 'paid') && (
        <PaymentDistributionsSection periodId={period.id} grandTotal={grandTotal} />
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
          try {
            await payroll.addMaterialInvoice(invoice)
            setShowAddMaterial(false)
          } catch {
            // El hook ya muestra el error; mantenemos el modal abierto.
          }
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
            try {
              await payroll.updateMaterialInvoice(editMaterialInvoice.id, invoice)
              setEditMaterialInvoice(null)
            } catch {
              // El hook ya muestra el error; mantenemos el modal abierto.
            }
          }
        }}
        onContractorCreated={(contractor) => setContractors((prev) => [contractor, ...prev])}
        onSupplierCreated={(supplier) => setSuppliers((prev) => [supplier, ...prev])}
      />

      <PayrollEditorMobileActionBar
        period={period}
        saving={payroll.saving}
        canApprove={roles.canApprovePayroll}
        canReturnToDraft={canReturnToDraft}
        onReturnToDraft={() => setConfirmReturnToDraft(true)}
        onUpdateStatus={handleUpdateStatus}
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

      <ConfirmModal
        open={submitWarning !== null}
        variant="warning"
        title="Aún falta distribuir pagos"
        message={
          submitWarning
            ? `Todavía falta repartir ${formatRD(submitWarning.remaining)} del total de este reporte. Puedes enviarlo a aprobación de todos modos y terminar de distribuir los pagos más tarde.`
            : ''
        }
        confirmLabel="Enviar de todos modos"
        cancelLabel="Seguir distribuyendo"
        onConfirm={() => {
          void payroll.updateStatus('submitted')
        }}
        onCancel={() => setSubmitWarning(null)}
      />
    </div>
  )
}
