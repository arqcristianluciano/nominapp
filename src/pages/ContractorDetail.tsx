import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, HardHat, Phone, CreditCard, Layers, FileText, Building2 } from 'lucide-react'
import { contractorService } from '@/services/contractorService'
import { formatRD } from '@/utils/currency'
import type { Contractor } from '@/types/database'

interface LaborItem {
  id: string
  description: string
  subtotal: number
  is_advance: boolean
  is_advance_deduction: boolean
  payroll_period?: {
    id: string
    period_number: number
    report_date: string
    status: string
    project_id: string
  }
  project?: { id: string; name: string; code: string }
}

interface Cubication {
  id: string
  specialty: string
  adjusted_budget: number
  total_advanced: number
  completion_percent: number
  remaining: number
  project_id: string
}

interface ProjectSummary {
  id: string
  name: string
  code: string
  total: number
  periods: Set<string>
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', submitted: 'En revisión', approved: 'Aprobada', paid: 'Pagada',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-app-chip text-app-muted',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}
const METHOD_LABEL: Record<string, string> = { cash: 'Efectivo', check: 'Cheque', transfer: 'Transferencia' }

export default function ContractorDetail() {
  const { contractorId } = useParams<{ contractorId: string }>()
  const [contractor, setContractor] = useState<Contractor | null>(null)
  const [items, setItems] = useState<LaborItem[]>([])
  const [cubications, setCubications] = useState<Cubication[]>([])
  const [projectMap, setProjectMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contractorId) return
    load()
  }, [contractorId])

  async function load() {
    setLoading(true)
    try {
      const [ctrs, { items: laborItems, cubications: cubs, projectMap: pmap }] = await Promise.all([
        contractorService.getAll(),
        contractorService.getHistory(contractorId!),
      ])
      const found = ctrs.find((c) => c.id === contractorId) ?? null
      setContractor(found)
      setItems(laborItems)
      setCubications(cubs)
      setProjectMap(pmap)
    } finally {
      setLoading(false)
    }
  }

  const billableItems = items.filter((i) => !i.is_advance_deduction)
  const totalPaid = billableItems.reduce((s, i) => s + i.subtotal, 0)
  const totalContracted = cubications.reduce((s, c) => s + (c.adjusted_budget || 0), 0)

  // Group by project for summary
  const byProject: Record<string, ProjectSummary> = {}
  for (const item of billableItems) {
    const pid = item.payroll_period?.project_id
    if (!pid) continue
    const proj = item.project || projectMap[pid]
    if (!byProject[pid]) {
      byProject[pid] = { id: pid, name: proj?.name || pid, code: proj?.code || '', total: 0, periods: new Set() }
    }
    byProject[pid].total += item.subtotal
    if (item.payroll_period?.id) byProject[pid].periods.add(item.payroll_period.id)
  }

  if (loading) {
    return <div className="text-sm text-app-muted p-6">Cargando...</div>
  }

  if (!contractor) {
    return (
      <div className="p-6">
        <p className="text-sm text-app-muted">Contratista no encontrado.</p>
        <Link to="/contratistas" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/contratistas" className="p-2 text-app-subtle hover:text-app-muted rounded-lg hover:bg-app-hover-strong">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-app-text">{contractor.name}</h1>
          <p className="text-sm text-app-muted">{contractor.specialty || 'Sin especialidad'}</p>
        </div>
      </div>

      {/* Contractor Info */}
      <div className="bg-app-surface rounded-xl border border-app-border p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {contractor.cedula && (
            <div>
              <p className="text-xs text-app-subtle mb-0.5">Cédula</p>
              <p className="font-medium text-app-text">{contractor.cedula}</p>
            </div>
          )}
          {contractor.phone && (
            <div>
              <p className="text-xs text-app-subtle mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</p>
              <p className="font-medium text-app-text">{contractor.phone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-app-subtle mb-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Forma de pago</p>
            <p className="font-medium text-app-text">{METHOD_LABEL[contractor.payment_method]}</p>
          </div>
          {contractor.bank_name && (
            <div>
              <p className="text-xs text-app-subtle mb-0.5">Banco</p>
              <p className="font-medium text-app-text">{contractor.bank_name}</p>
              {contractor.bank_account && <p className="text-xs text-app-muted">{contractor.bank_account}</p>}
            </div>
          )}
        </div>
        {contractor.notes && (
          <p className="mt-3 text-xs text-app-muted bg-app-bg rounded-lg px-3 py-2">{contractor.notes}</p>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total cobrado" value={formatRD(totalPaid)} color="emerald" />
        <KpiCard label="Contrato total" value={totalContracted > 0 ? formatRD(totalContracted) : '—'} color="blue" />
        <KpiCard label="Proyectos" value={Object.keys(byProject).length} color="purple" />
        <KpiCard label="Reportes" value={new Set(items.map(i => i.payroll_period?.id).filter(Boolean)).size} color="amber" />
      </div>

      {/* By Project Summary */}
      {Object.keys(byProject).length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-app-subtle" /> Por proyecto
          </h2>
          <div className="space-y-2">
            {Object.values(byProject).map((proj) => (
              <Link
                key={proj.id}
                to={`/proyectos/${proj.id}`}
                className="flex items-center justify-between bg-app-surface rounded-xl border border-app-border px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-app-text">{proj.name}</p>
                  <p className="text-xs text-app-subtle">{proj.code} · {proj.periods.size} reporte{proj.periods.size !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-sm font-semibold text-app-muted">{formatRD(proj.total)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cubicaciones */}
      {cubications.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-app-subtle" /> Contratos de cubicación
          </h2>
          <div className="space-y-2">
            {cubications.map((cub) => {
              const project = projectMap[cub.project_id]
              const pct = Math.round(cub.completion_percent)
              return (
                <div key={cub.id} className="bg-app-surface rounded-xl border border-app-border px-4 py-3">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-text truncate">{cub.specialty}</p>
                      {project && <p className="text-xs text-app-subtle">{project.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-app-muted">{formatRD(cub.total_advanced)}</p>
                      <p className="text-xs text-app-subtle">de {formatRD(cub.adjusted_budget || 0)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-app-chip rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-app-subtle mt-1">{pct}% completado · Pendiente {formatRD(cub.remaining)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Labor Line Items Detail */}
      {items.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-app-subtle" /> Detalle de reportes
          </h2>
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg border-b border-app-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted">Descripción</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden md:table-cell">Proyecto</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden sm:table-cell">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden sm:table-cell">Estado</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-app-muted">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {items.map((item) => (
                  <tr key={item.id} className={item.is_advance_deduction ? 'opacity-50' : ''}>
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-app-text">{item.description}</p>
                      {item.is_advance && <span className="text-[10px] text-amber-600">Adelanto</span>}
                      {item.is_advance_deduction && <span className="text-[10px] text-red-500">Deducción</span>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <p className="text-xs text-app-muted truncate max-w-32">{item.project?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <p className="text-xs text-app-muted">{item.payroll_period?.report_date || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {item.payroll_period?.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[item.payroll_period.status]}`}>
                          {STATUS_LABEL[item.payroll_period.status]}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right text-xs font-medium ${item.is_advance_deduction ? 'text-red-500' : 'text-app-text'}`}>
                      {item.is_advance_deduction ? '-' : ''}{formatRD(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-app-bg border-t border-app-border">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-app-muted">Total cobrado</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-app-text">{formatRD(totalPaid)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {items.length === 0 && cubications.length === 0 && (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <HardHat className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-sm text-app-muted">Este contratista no tiene historial de pagos aún.</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className={`rounded-xl border border-app-border p-4 ${colors[color].split(' ')[0]} bg-opacity-40`}>
      <p className="text-xs text-app-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  )
}
