import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CxPView } from '@/components/features/control/CxPView'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'

export default function CxPDetalle() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (!projectId) return
    const id = projectId
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const txs = await transactionService.getByProject(id)
        if (!cancelled) setTransactions(txs)
      } catch {
        if (!cancelled) setError('No se pudieron cargar las transacciones.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (!projectId) {
    return <p className="text-sm text-app-muted">Proyecto no especificado.</p>
  }

  if (!loading && projects.length > 0 && !project) {
    return (
      <div className="space-y-3">
        <p className="text-app-muted">Proyecto no encontrado.</p>
        <Link to="/cxp" className="text-sm text-blue-600 hover:underline">
          Volver a Cuentas por pagar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cxp" className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2">
          <ArrowLeft className="w-4 h-4" /> Cuentas por pagar
        </Link>
        <h1 className="text-2xl font-semibold text-app-text">Cuentas por Pagar</h1>
        <p className="text-sm text-app-muted mt-1">
          {project ? `${project.name} · ${project.code}` : 'Cargando proyecto...'}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">Cargando cuentas por pagar...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <CxPView transactions={transactions} />
      )}
    </div>
  )
}
