import { ArrowLeft, CheckCircle, CreditCard, Printer, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { AddLaborItemForm } from '@/components/features/payroll/AddLaborItemForm'
import { AddMaterialForm } from '@/components/features/payroll/AddMaterialForm'
import type {
  BudgetCategory,
  Contractor,
  LaborLineItem,
  MaterialInvoice,
  PayrollPeriod,
  PriceListItem,
  Supplier,
} from '@/types/database'

const NEXT_STATUS: Record<string, { label: string; status: 'submitted' | 'approved' | 'paid'; icon: typeof Send }> = {
  draft: { label: 'Enviar para aprobación', status: 'submitted', icon: Send },
  submitted: { label: 'Aprobar reporte', status: 'approved', icon: CheckCircle },
  approved: { label: 'Marcar como pagado', status: 'paid', icon: CreditCard },
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-app-chip text-app-muted',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  paid: 'bg-emerald-50 text-emerald-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  paid: 'Pagado',
}

export function PayrollEditorHeader({
  period,
  saving,
  canApprove = true,
  onUpdateStatus,
}: {
  period: PayrollPeriod
  saving: boolean
  canApprove?: boolean
  onUpdateStatus: (status: 'submitted' | 'approved' | 'paid') => Promise<void>
}) {
  const project = period.project
  const next = NEXT_STATUS[period.status]
  // Las transiciones submitted->approved y approved->paid son del Director.
  // draft->submitted la puede iniciar el ingeniero de obra.
  const requiresDirector = next?.status === 'approved' || next?.status === 'paid'
  const showNextButton = next && (canApprove || !requiresDirector)
  return (
    <div className="sticky top-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 pt-1 pb-3 bg-app-bg/95 backdrop-blur supports-[backdrop-filter]:bg-app-bg/80 border-b border-app-border lg:border-0 lg:static lg:bg-transparent lg:backdrop-blur-0 lg:p-0">
      <Link
        to={project ? `/proyectos/${project.id}` : '/proyectos'}
        className="inline-flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2 min-h-[44px] sm:min-h-[32px] -ml-1 px-1"
      >
        <ArrowLeft className="w-4 h-4" />{' '}
        <span className="truncate max-w-[70vw] sm:max-w-none">{project?.name || 'Proyecto'}</span>
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
        <div className="min-w-0 flex items-start sm:items-center justify-between sm:justify-start gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-app-text truncate">
              Reporte No. {period.period_number}
            </h1>
            <p className="text-xs sm:text-sm text-app-muted mt-0.5 truncate">
              {new Date(period.report_date).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {period.reported_by && ` · ${period.reported_by}`}
            </p>
          </div>
          <span
            className={`sm:hidden shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[period.status]}`}
          >
            {STATUS_LABELS[period.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`hidden sm:inline-flex px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${STATUS_COLORS[period.status]}`}
          >
            {STATUS_LABELS[period.status]}
          </span>
          <Link
            to={`/nominas/${period.id}/imprimir`}
            target="_blank"
            aria-label="Imprimir"
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          >
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir</span>
          </Link>
          {/* Next-status button is duplicated in the mobile sticky action bar to keep the header compact on small screens. */}
          {showNextButton && (
            <button
              onClick={() => onUpdateStatus(next.status)}
              disabled={saving}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] sm:min-h-0"
            >
              <next.icon className="w-4 h-4" />
              {next.label}
            </button>
          )}
          {next && !showNextButton && (
            <span className="text-xs text-app-muted italic">{requiresDirector ? 'Pendiente del Director' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function PayrollEditorMobileActionBar({
  period,
  saving,
  canApprove = true,
  onUpdateStatus,
}: {
  period: PayrollPeriod
  saving: boolean
  canApprove?: boolean
  onUpdateStatus: (status: 'submitted' | 'approved' | 'paid') => Promise<void>
}) {
  const next = NEXT_STATUS[period.status]
  const requiresDirector = next?.status === 'approved' || next?.status === 'paid'
  const showNextButton = next && (canApprove || !requiresDirector)
  if (!showNextButton) return null
  return (
    <div
      className="sm:hidden sticky bottom-0 -mx-4 px-4 py-3 bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/80 border-t border-app-border z-20"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={() => onUpdateStatus(next.status)}
        disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
      >
        <next.icon className="w-4 h-4" />
        {next.label}
      </button>
    </div>
  )
}

type MaterialFormPayload = {
  supplier_id: string
  invoice_reference?: string
  attachment_path?: string | null
  items: { description: string; amount: number }[]
}

type LaborFormPayload = {
  contractor_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  is_advance: boolean
  is_advance_deduction: boolean
  budget_category_id?: string | null
}

export function PayrollEditorModals({
  showAddMaterial,
  showAddLabor,
  editLaborItem,
  editMaterialInvoice,
  periodId,
  projectId,
  suppliers,
  contractors,
  laborTasks,
  budgetCategories,
  saving,
  onCloseAddMaterial,
  onCloseAddLabor,
  onCloseEditLabor,
  onCloseEditMaterial,
  onAddMaterial,
  onAddLabor,
  onUpdateLabor,
  onUpdateMaterial,
  onContractorCreated,
}: {
  showAddMaterial: boolean
  showAddLabor: boolean
  editLaborItem: LaborLineItem | null
  editMaterialInvoice: MaterialInvoice | null
  periodId: string
  projectId: string
  suppliers: Supplier[]
  contractors: Contractor[]
  laborTasks: PriceListItem[]
  budgetCategories?: BudgetCategory[]
  saving: boolean
  onCloseAddMaterial: () => void
  onCloseAddLabor: () => void
  onCloseEditLabor: () => void
  onCloseEditMaterial: () => void
  onAddMaterial: (inv: MaterialFormPayload) => Promise<void>
  onAddLabor: (item: LaborFormPayload) => Promise<void>
  onUpdateLabor: (item: LaborFormPayload) => Promise<void>
  onUpdateMaterial: (inv: MaterialFormPayload) => Promise<void>
  onContractorCreated: (contractor: Contractor) => void
}) {
  return (
    <>
      <Modal open={showAddMaterial} onClose={onCloseAddMaterial} title="Agregar factura de materiales">
        <AddMaterialForm
          suppliers={suppliers}
          periodId={periodId}
          projectId={projectId}
          onSubmit={onAddMaterial}
          onCancel={onCloseAddMaterial}
          saving={saving}
        />
      </Modal>
      <Modal open={showAddLabor} onClose={onCloseAddLabor} title="Agregar partida de mano de obra">
        <AddLaborItemForm
          contractors={contractors}
          laborTasks={laborTasks}
          budgetCategories={budgetCategories}
          onSubmit={onAddLabor}
          onCancel={onCloseAddLabor}
          saving={saving}
          onContractorCreated={onContractorCreated}
        />
      </Modal>
      <Modal open={!!editMaterialInvoice} onClose={onCloseEditMaterial} title="Editar factura de materiales">
        {editMaterialInvoice && (
          <AddMaterialForm
            key={editMaterialInvoice.id}
            suppliers={suppliers}
            periodId={periodId}
            projectId={projectId}
            onSubmit={onUpdateMaterial}
            onCancel={onCloseEditMaterial}
            saving={saving}
            initialInvoice={editMaterialInvoice}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>
      <Modal open={!!editLaborItem} onClose={onCloseEditLabor} title="Editar partida de mano de obra">
        {editLaborItem && (
          <AddLaborItemForm
            key={editLaborItem.id}
            contractors={contractors}
            laborTasks={laborTasks}
            budgetCategories={budgetCategories}
            onSubmit={onUpdateLabor}
            onCancel={onCloseEditLabor}
            saving={saving}
            onContractorCreated={onContractorCreated}
            initialItem={editLaborItem}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>
    </>
  )
}
