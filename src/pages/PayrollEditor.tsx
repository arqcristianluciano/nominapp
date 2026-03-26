import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, Send, CreditCard, Printer } from 'lucide-react'
import { usePayroll } from '@/hooks/usePayroll'
import { contractorService } from '@/services/contractorService'
import { supplierService } from '@/services/supplierService'
import { Modal } from '@/components/ui/Modal'
import { AddLaborItemForm } from '@/components/features/payroll/AddLaborItemForm'
import { AddMaterialForm } from '@/components/features/payroll/AddMaterialForm'
import { PaymentDistributionsSection } from '@/components/features/payments/PaymentDistributionsSection'
import { LoanDeductionSection } from '@/components/features/payroll/LoanDeductionSection'
import { formatRD, formatNumber } from '@/utils/currency'
import { calcContractorSubtotal } from '@/utils/calculations'
import type { Contractor, Supplier } from '@/types/database'

export default function PayrollEditor() {
  const { periodId } = useParams<{ periodId: string }>()
  const payroll = usePayroll(periodId)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showAddLabor, setShowAddLabor] = useState(false)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    payroll.load()
    contractorService.getAll().then(setContractors)
    supplierService.getAll().then(setSuppliers)
  }, [payroll.load])

  const contractorGroups = useMemo(() => {
    const groups = new Map<string, { contractor: Contractor; items: typeof payroll.laborItems }>()
    for (const item of payroll.laborItems) {
      const cId = item.contractor_id
      if (!groups.has(cId)) {
        const c = item.contractor || contractors.find(x => x.id === cId) || { id: cId, name: 'Desconocido', specialty: null } as Contractor
        groups.set(cId, { contractor: c, items: [] })
      }
      groups.get(cId)!.items.push(item)
    }
    return Array.from(groups.values())
  }, [payroll.laborItems, contractors])

  const toggle = (id: string) => setOpenSections(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }))
  const isOpen = (id: string) => openSections[id] !== false

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Mano de obra</p><p className="text-sm font-semibold mt-0.5">{formatRD(period.total_labor || 0)}</p></div>
        <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Materiales</p><p className="text-sm font-semibold mt-0.5">{formatRD(period.total_materials || 0)}</p></div>
        <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Indirectos</p><p className="text-sm font-semibold mt-0.5">{formatRD(period.total_indirect || 0)}</p></div>
        <div className="rounded-lg px-3 py-2.5 bg-blue-600"><p className="text-xs text-blue-200">Total general</p><p className="text-sm font-semibold text-white mt-0.5">{formatRD(period.grand_total || 0)}</p></div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-app-text">Mano de obra</h2>
          {isDraft && (
            <button onClick={() => setShowAddLabor(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover">
              <Plus className="w-4 h-4" /> Agregar partida
            </button>
          )}
        </div>

        {contractorGroups.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">
            No hay partidas de mano de obra registradas
          </div>
        ) : (
          <div className="space-y-2">
            {contractorGroups.map(({ contractor, items }) => {
              const sub = calcContractorSubtotal(payroll.laborItems, contractor.id)
              return (
                <div key={contractor.id} className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
                  <button onClick={() => toggle(contractor.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-app-hover">
                    <div className="flex items-center gap-2">
                      {isOpen(contractor.id) ? <ChevronDown className="w-4 h-4 text-app-subtle" /> : <ChevronRight className="w-4 h-4 text-app-subtle" />}
                      <span className="font-medium text-app-text">{contractor.name}</span>
                      {contractor.specialty && <span className="text-xs text-app-subtle">{contractor.specialty}</span>}
                    </div>
                    <span className="text-sm font-semibold text-app-text">{formatRD(sub)}</span>
                  </button>
                  {isOpen(contractor.id) && (
                    <table className="w-full text-sm border-t border-app-border">
                      <thead><tr className="bg-app-bg">
                        <th className="text-left px-4 py-2 font-medium text-app-muted">Descripción</th>
                        <th className="text-right px-3 py-2 font-medium text-app-muted w-20">Cant.</th>
                        <th className="text-center px-3 py-2 font-medium text-app-muted w-16">Ud.</th>
                        <th className="text-right px-3 py-2 font-medium text-app-muted w-24">Precio</th>
                        <th className="text-right px-4 py-2 font-medium text-app-muted w-28">Subtotal</th>
                        {isDraft && <th className="w-10" />}
                      </tr></thead>
                      <tbody className="divide-y divide-app-border">
                        {items.map((item) => (
                          <tr key={item.id} className={item.is_advance_deduction ? 'text-red-600' : ''}>
                            <td className="px-4 py-2 text-app-muted">
                              {item.description}
                              {item.is_advance && <span className="ml-1 text-xs text-blue-500">(avance)</span>}
                              {item.is_advance_deduction && <span className="ml-1 text-xs text-red-400">(deducción)</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-app-muted">{formatNumber(item.quantity)}</td>
                            <td className="px-3 py-2 text-center text-app-muted">{item.unit}</td>
                            <td className="px-3 py-2 text-right text-app-muted">{formatRD(item.unit_price)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatRD(item.quantity * item.unit_price)}</td>
                            {isDraft && (
                              <td className="px-2 py-2">
                                <button onClick={() => payroll.deleteLaborItem(item.id)} className="p-1 text-app-subtle hover:text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-3 bg-blue-50 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Total mano de obra</span>
          <span className="text-sm font-semibold text-blue-900">{formatRD(period.total_labor || 0)}</span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-app-text">Materiales</h2>
          {isDraft && (
            <button onClick={() => setShowAddMaterial(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover">
              <Plus className="w-4 h-4" /> Agregar factura
            </button>
          )}
        </div>

        {payroll.materialInvoices.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">
            No hay facturas de materiales registradas
          </div>
        ) : (
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-2.5 font-medium text-app-muted">Proveedor</th>
                <th className="text-left px-4 py-2.5 font-medium text-app-muted">Descripción</th>
                <th className="text-right px-4 py-2.5 font-medium text-app-muted">Monto</th>
                {isDraft && <th className="w-10" />}
              </tr></thead>
              <tbody className="divide-y divide-app-border">
                {payroll.materialInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-app-hover">
                    <td className="px-4 py-2.5 text-app-text">{inv.supplier?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-app-muted">
                      {inv.description}
                      {inv.invoice_reference && <span className="text-xs text-app-subtle ml-1">{inv.invoice_reference}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(inv.amount)}</td>
                    {isDraft && (
                      <td className="px-2 py-2.5">
                        <button onClick={() => payroll.deleteMaterialInvoice(inv.id)} className="p-1 text-app-subtle hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 bg-amber-50 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-amber-900">Total materiales</span>
          <span className="text-sm font-semibold text-amber-900">{formatRD(period.total_materials || 0)}</span>
        </div>
      </section>

      {payroll.indirectCosts.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-app-text mb-3">Gastos indirectos</h2>
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-app-border">
                {payroll.indirectCosts.map((cost) => (
                  <tr key={cost.id}>
                    <td className="px-4 py-2.5 text-app-muted">{cost.description}</td>
                    <td className="px-4 py-2.5 text-right text-app-muted">{cost.percentage ? `${cost.percentage}%` : 'Fijo'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-app-text w-32">{formatRD(cost.calculated_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 bg-purple-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-purple-900">Total indirectos</span>
            <span className="text-sm font-semibold text-purple-900">{formatRD(period.total_indirect || 0)}</span>
          </div>
        </section>
      )}

      <LoanDeductionSection periodId={period.id} isDraft={isDraft} />

      {(period.status === 'approved' || period.status === 'paid') && (
        <PaymentDistributionsSection periodId={period.id} grandTotal={period.grand_total || 0} />
      )}

      <Modal open={showAddLabor} onClose={() => setShowAddLabor(false)} title="Agregar partida de mano de obra" >
        <AddLaborItemForm
          contractors={contractors}
          onSubmit={async (item) => { await payroll.addLaborItem(item); setShowAddLabor(false) }}
          onCancel={() => setShowAddLabor(false)}
          saving={payroll.saving}
          onContractorCreated={(c) => setContractors(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      </Modal>

      <Modal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} title="Agregar factura de materiales">
        <AddMaterialForm
          suppliers={suppliers}
          onSubmit={async (inv) => { await payroll.addMaterialInvoice(inv); setShowAddMaterial(false) }}
          onCancel={() => setShowAddMaterial(false)}
          saving={payroll.saving}
        />
      </Modal>
    </div>
  )
}
