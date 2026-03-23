import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { calcCxPDetails, type CxPItem } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

interface CxPProjectGroup {
  projectName: string
  projectId: string
  items: CxPItem[]
  total: number
}

export default function CxPConsolidado() {
  const { projects, fetchProjects } = useProjectStore()
  const [groups, setGroups] = useState<CxPProjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [grandTotal, setGrandTotal] = useState(0)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    async function loadAll() {
      const activeProjects = projects.filter((p) => p.status === 'active')
      if (activeProjects.length === 0) {
        setLoading(false)
        return
      }

      try {
        const results: CxPProjectGroup[] = []
        let total = 0

        for (const project of activeProjects) {
          const transactions = await transactionService.getByProject(project.id)
          const cxpItems = calcCxPDetails(transactions)
          if (cxpItems.length > 0) {
            const projectTotal = cxpItems.reduce((sum, i) => sum + i.pending, 0)
            total += projectTotal
            results.push({
              projectName: project.name,
              projectId: project.id,
              items: cxpItems,
              total: projectTotal,
            })
          }
        }

        setGroups(results)
        setGrandTotal(total)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    if (projects.length > 0) loadAll()
  }, [projects])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cuentas por Pagar</h1>
        <p className="text-sm text-gray-500 mt-1">Vista consolidada de todas las CxP de todos los proyectos</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs text-red-600">Total CxP consolidado</p>
        <p className="text-2xl font-bold text-red-700">{formatRD(grandTotal)}</p>
        <p className="text-xs text-gray-500 mt-1">{groups.length} proyecto(s) con CxP pendientes</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando cuentas por pagar...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay cuentas por pagar pendientes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.projectId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{group.projectName}</h3>
                  <p className="text-xs text-gray-500">{group.items.length} factura(s) pendiente(s)</p>
                </div>
                <span className="text-sm font-bold text-red-700">{formatRD(group.total)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Factura</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Proveedor</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Pendiente</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Condición</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{item.invoiceNumber || '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-900 font-medium">{item.supplierName}</td>
                      <td className="px-4 py-2 text-xs text-red-700 font-semibold text-right">{formatRD(item.pending)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{item.paymentCondition}</td>
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
