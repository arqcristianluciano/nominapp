import { ArrowLeft, CheckCircle, CreditCard, Printer, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { AddLaborItemForm } from '@/components/features/payroll/AddLaborItemForm'
import { AddMaterialForm } from '@/components/features/payroll/AddMaterialForm'
import type { BudgetCategory, Contractor, PayrollPeriod, PriceListItem, Supplier } from '@/types/database'

const NEXT_STATUS: Record<string, { label: string; status: 'submitted' | 'approved' | 'paid'; icon: typeof Send }> = {
  draft: { label: 'Enviar para aprobación', status: 'submitted', icon: Send },
  submitted: { label: 'Aprobar reporte', status: 'approved', icon: CheckCircle },
  approved: { label: 'Marcar como pagado', status: 'paid', icon: CreditCard },
}
const STATUS_COLORS: Record<string, string> = { draft: 'bg-app-chip text-app-muted', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-green-50 text-green-700', paid: 'bg-emerald-50 text-emerald-700' }
const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', submitted: 'Enviado', approved: 'Aprobado', paid: 'Pagado' }

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
  // Las transiciones submitted->approved y approved->paid son del Gerente.
  // draft->submitted la puede iniciar el ingeniero de obra.
  const requiresGerente = next?.status === 'approved' || next?.status === 'paid'
  const showNextButton = next && (canApprove || !requiresGerente)
  return (
    <div>
      <Link to={project ? `/proyectos/${project.id}` : '/proyectos'} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2"><ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}</Link>
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h1 className="text-2xl font-semibold text-app-text">Reporte No. {period.period_number}</h1><p className="text-sm text-app-muted mt-0.5">{new Date(period.report_date).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}{period.reported_by && ` · ${period.reported_by}`}</p></div><div className="flex items-center gap-2"><span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[period.status]}`}>{STATUS_LABELS[period.status]}</span><Link to={`/nominas/${period.id}/imprimir`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"><Printer className="w-4 h-4" /> Imprimir</Link>{showNextButton && <button onClick={() => onUpdateStatus(next.status)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"><next.icon className="w-4 h-4" />{next.label}</button>}{next && !showNextButton && <span className="text-xs text-app-muted italic">{requiresGerente ? 'Pendiente del Gerente' : ''}</span>}</div></div>
    </div>
  )
}

export function PayrollEditorModals({
  showAddMaterial,
  showAddLabor,
  suppliers,
  contractors,
  laborTasks,
  budgetCategories,
  saving,
  onCloseAddMaterial,
  onCloseAddLabor,
  onAddMaterial,
  onAddLabor,
  onContractorCreated,
}: {
  showAddMaterial: boolean
  showAddLabor: boolean
  suppliers: Supplier[]
  contractors: Contractor[]
  laborTasks: PriceListItem[]
  budgetCategories?: BudgetCategory[]
  saving: boolean
  onCloseAddMaterial: () => void
  onCloseAddLabor: () => void
  onAddMaterial: (inv: {
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
  }) => Promise<void>
  onAddLabor: (item: {
    contractor_id: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    is_advance: boolean
    is_advance_deduction: boolean
    budget_category_id?: string | null
  }) => Promise<void>
  onContractorCreated: (contractor: Contractor) => void
}) {
  return (
    <>
      <Modal open={showAddMaterial} onClose={onCloseAddMaterial} title="Agregar factura de materiales"><AddMaterialForm suppliers={suppliers} onSubmit={onAddMaterial} onCancel={onCloseAddMaterial} saving={saving} /></Modal>
      <Modal open={showAddLabor} onClose={onCloseAddLabor} title="Agregar partida de mano de obra"><AddLaborItemForm contractors={contractors} laborTasks={laborTasks} budgetCategories={budgetCategories} onSubmit={onAddLabor} onCancel={onCloseAddLabor} saving={saving} onContractorCreated={onContractorCreated} /></Modal>
    </>
  )
}
