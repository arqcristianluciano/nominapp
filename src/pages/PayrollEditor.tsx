import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Send, CreditCard, Printer } from 'lucide-react'
import { usePayroll } from '@/hooks/usePayroll'
import { supplierService } from '@/services/supplierService'
import { contractorService } from '@/services/contractorService'
import { priceListService } from '@/services/priceListService'
import { Modal } from '@/components/ui/Modal'
import { AddMaterialForm } from '@/components/features/payroll/AddMaterialForm'
import { AddLaborItemForm } from '@/components/features/payroll/AddLaborItemForm'
import { PaymentDistributionsSection } from '@/components/features/payments/PaymentDistributionsSection'
import { LoanDeductionSection } from '@/components/features/payroll/LoanDeductionSection'
import { CubicacionesPayrollSection } from '@/components/features/cubicacion/CubicacionesPayrollSection'
import { PayrollTotalsCards } from '@/components/features/payroll/PayrollTotalsCards'
import { LaborItemsSection } from '@/components/features/payroll/LaborItemsSection'
import { MaterialInvoicesSection } from '@/components/features/payroll/MaterialInvoicesSection'
import { IndirectCostsSection } from '@/components/features/payroll/IndirectCostsSection'
import type { Contractor, PriceListItem, Supplier } from '@/types/database'

export default function PayrollEditor() {
  const { periodId } = useParams<{ periodId: string }>()
  const payroll = usePayroll(periodId)
  const loadPayroll = payroll.load
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [laborTasks, setLaborTasks] = useState<PriceListItem[]>([])
  const [showAddLabor, setShowAddLabor] = useState(false)
  const [showAddMaterial, setShowAddMaterial] = useState(false)

  useEffect(() => {
    loadPayroll()
    Promise.all([
      supplierService.getAll(),
      contractorService.getAll(),
    ]).then(([nextSuppliers, nextContractors]) => {
      setSuppliers(nextSuppliers)
      setContractors(nextContractors)
    })
  }, [loadPayroll])

  useEffect(() => {
    if (!payroll.period?.project_id) return
    priceListService
      .getByProject(payroll.period.project_id)
      .then((items) => setLaborTasks(items.filter((item) => item.category === 'labor')))
      .catch(() => setLaborTasks([]))
  }, [payroll.period?.project_id])

  if (payroll.loading) return <div className="text-sm text-app-muted p-4">Cargando nómina...</div>
  if (!payroll.period) return <div className="text-sm text-app-muted p-4">Nómina no encontrada</div>

  const { period } = payroll
  const project = period.project
  const isDraft = period.status === 'draft'

  const nextStatus: Record<string, { label: string; status: 'submitted' | 'approved' | 'paid'; icon: typeof Send }> = {
    draft: { label: 'Enviar para aprobación', status: 'submitted', icon: Send },
    submitted: { label: 'Aprobar reporte', status: 'approved', icon: CheckCircle },
    approved: { label: 'Marcar como pagado', status: 'paid', icon: CreditCard },
  }
  const next = nextStatus[period.status]

  const statusColors: Record<string, string> = { draft: 'bg-app-chip text-app-muted', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-green-50 text-green-700', paid: 'bg-emerald-50 text-emerald-700' }
  const statusLabels: Record<string, string> = { draft: 'Borrador', submitted: 'Enviado', approved: 'Aprobado', paid: 'Pagado' }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to={project ? `/proyectos/${project.id}` : '/proyectos'} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Reporte No. {period.period_number}</h1>
            <p className="text-sm text-app-muted mt-0.5">
              {new Date(period.report_date).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
              {period.reported_by && ` · ${period.reported_by}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[period.status]}`}>{statusLabels[period.status]}</span>
            <Link to={`/nominas/${period.id}/imprimir`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
              <Printer className="w-4 h-4" /> Imprimir
            </Link>
            {next && (
              <button onClick={() => payroll.updateStatus(next.status)} disabled={payroll.saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <next.icon className="w-4 h-4" />{next.label}
              </button>
            )}
          </div>
        </div>
      </div>

      {payroll.error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{payroll.error}</div>}

      <PayrollTotalsCards labor={period.total_labor || 0} materials={period.total_materials || 0} indirect={period.total_indirect || 0} grandTotal={period.grand_total || 0} />

      <LaborItemsSection items={payroll.laborItems} isDraft={isDraft} total={period.total_labor || 0} onOpenAdd={() => setShowAddLabor(true)} onDelete={payroll.deleteLaborItem} />
      <MaterialInvoicesSection invoices={payroll.materialInvoices} isDraft={isDraft} total={period.total_materials || 0} onOpenAdd={() => setShowAddMaterial(true)} onDelete={payroll.deleteMaterialInvoice} />
      <IndirectCostsSection costs={payroll.indirectCosts} isDraft={isDraft} saving={payroll.saving} total={period.total_indirect || 0} onToggleActive={payroll.setIndirectActive} />

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

      <Modal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="Agregar factura de materiales">
        <AddMaterialForm
          suppliers={suppliers}
          onSubmit={async (inv) => { await payroll.addMaterialInvoice(inv); setShowAddMaterial(false) }}
          onCancel={() => setShowAddMaterial(false)}
          saving={payroll.saving}
        />
      </Modal>

      <Modal open={showAddLabor} onClose={() => setShowAddLabor(false)} title="Agregar partida de mano de obra">
        <AddLaborItemForm
          contractors={contractors}
          laborTasks={laborTasks}
          onSubmit={async (item) => { await payroll.addLaborItem(item); setShowAddLabor(false) }}
          onCancel={() => setShowAddLabor(false)}
          saving={payroll.saving}
          onContractorCreated={(contractor) => setContractors((prev) => [contractor, ...prev])}
        />
      </Modal>
    </div>
  )
}
