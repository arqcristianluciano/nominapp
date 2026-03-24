import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { CxPProjectFilterBar } from '@/components/features/control/CxPProjectFilterBar'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService } from '@/services/transactionService'
import { calcCxPDetails, type CxPItem } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

interface CxPProjectGroup {
  projectName: string
  projectId: string
  items: CxPItem[]
  total: number
}

export default function CxPConsolidadoTodos() {
  const { projects, fetchProjects } = useProjectStore()
  const [groups, setGroups] = useState<CxPProjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState<string>('all')

  const activeProjects = useMemo(
    () =>
      [...projects.filter((p) => p.status === 'active')].sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      ),
    [projects]
  )

  const displayedGroups = useMemo(() => {
    if (projectFilter === 'all') return groups
    return groups.filter((g) => g.projectId === projectFilter)
  }, [groups, projectFilter])

  const displayedTotal = useMemo(
    () => displayedGroups.reduce((sum, g) => sum + g.total, 0),
    [displayedGroups]
  )

  const filteredProjectName = useMemo(() => {
    if (projectFilter === 'all') return null
    return activeProjects.find((p) => p.id === projectFilter)?.name ?? null
  }, [projectFilter, activeProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    async function loadAll() {
      const list = projects.filter((p) => p.status === 'active')
      if (list.length === 0) {
        setLoading(false)
        return
      }

      try {
        const results: CxPProjectGroup[] = []
        for (const project of list) {
          const transactions = await transactionService.getByProject(project.id)
          const cxpItems = calcCxPDetails(transactions)
          if (cxpItems.length > 0) {
            const projectTotal = cxpItems.reduce((sum, i) => sum + i.pending, 0)
            results.push({
              projectName: project.name,
              projectId: project.id,
              items: cxpItems,
              total: projectTotal,
            })
          }
        }
        setGroups(results)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (projects.length > 0) loadAll()
  }, [projects])

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cxp" className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2">
          <ArrowLeft className="w-4 h-4" /> Cuentas por pagar
        </Link>
        <h1 className="text-2xl font-semibold text-app-text">CxP consolidado</h1>
        <p className="text-sm text-app-muted mt-1">
          {projectFilter === 'all'
            ? 'Todas las obras con saldo pendiente'
            : `Filtrado: ${filteredProjectName ?? '—'}`}
        </p>
      </div>

      <CxPProjectFilterBar value={projectFilter} onChange={setProjectFilter} activeProjects={activeProjects} />

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs text-red-600">
          {projectFilter === 'all' ? 'Total CxP consolidado' : 'Total CxP (proyecto seleccionado)'}
        </p>
        <p className="text-2xl font-bold text-red-700">{formatRD(displayedTotal)}</p>
        <p className="text-xs text-app-muted mt-1">
          {projectFilter === 'all'
            ? `${groups.length} proyecto(s) con CxP pendientes`
            : `${displayedGroups.length} proyecto(s) en vista`}
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando cuentas por pagar...</div>
      ) : groups.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <CreditCard className="w-12 h-12 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay cuentas por pagar pendientes</p>
        </div>
      ) : displayedGroups.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <CreditCard className="w-12 h-12 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">
            No hay cuentas por pagar pendientes
            {filteredProjectName ? ` para «${filteredProjectName}»` : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGroups.map((group) => (
            <div key={group.projectId} className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
              <div className="bg-app-bg px-4 py-3 border-b border-app-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-app-text">{group.projectName}</h3>
                  <p className="text-xs text-app-muted">{group.items.length} factura(s) pendiente(s)</p>
                </div>
                <span className="text-sm font-bold text-red-700">{formatRD(group.total)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-app-border">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pendiente</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Condición</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-app-border hover:bg-app-hover">
                      <td className="px-4 py-2 text-xs text-app-muted">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                      <td className="px-4 py-2 text-xs text-app-muted">{item.invoiceNumber || '—'}</td>
                      <td className="px-4 py-2 text-xs text-app-text font-medium">{item.supplierName}</td>
                      <td className="px-4 py-2 text-xs text-red-700 font-semibold text-right">{formatRD(item.pending)}</td>
                      <td className="px-4 py-2 text-xs text-app-muted">{item.paymentCondition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
