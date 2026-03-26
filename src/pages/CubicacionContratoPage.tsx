import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Scissors, Wallet, Printer } from 'lucide-react'
import { contractService } from '@/services/cubicationService'
import { useProjectStore } from '@/stores/projectStore'
import { formatRD } from '@/utils/currency'
import { PartidaSection } from '@/components/features/cubicacion/PartidaSection'
import { CorteSection } from '@/components/features/cubicacion/CorteSection'
import { AdelantoSection } from '@/components/features/cubicacion/AdelantoSection'
import type { ContractWithContractor, ContractPartida, ContractCorte, ContractAdelanto } from '@/services/cubicationService'

type Tab = 'partidas' | 'cortes' | 'adelantos'

export default function CubicacionContratoPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('partidas')

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    if (contratoId) load()
  }, [contratoId])

  async function load() {
    setLoading(true)
    try { setContrato(await contractService.getById(contratoId!)) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="text-sm text-app-muted p-6">Cargando contrato...</div>
  if (!contrato) return <div className="text-sm text-app-muted p-6">Contrato no encontrado.</div>

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const cortes: ContractCorte[] = contrato.cortes ?? []
  const adelantos: ContractAdelanto[] = contrato.adelantos ?? []

  const acordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const acumulado = cortes.reduce((s, c) => s + c.amount, 0)
  const retenido  = cortes.reduce((s, c) => s + c.retention_amount, 0)
  const adelantosTotal = adelantos.reduce((s, a) => s + a.amount, 0)
  const pendiente = acordado - acumulado

  const kpis = [
    { label: 'Acordado (A)', value: formatRD(acordado), color: 'text-app-text' },
    { label: 'Acumulado (B)', value: formatRD(acumulado), color: 'text-blue-700' },
    { label: 'Pendiente (A-B)', value: formatRD(pendiente), color: pendiente >= 0 ? 'text-green-700' : 'text-red-600' },
    { label: `Retenido (${contrato.retention_percent}%)`, value: formatRD(retenido), color: 'text-amber-700' },
  ]

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'partidas',  label: 'Partidas',  icon: <FileText className="w-3.5 h-3.5" />,  count: partidas.length },
    { id: 'cortes',    label: 'Cortes',    icon: <Scissors className="w-3.5 h-3.5" />,   count: cortes.length },
    { id: 'adelantos', label: 'Adelantos', icon: <Wallet className="w-3.5 h-3.5" />,     count: adelantos.length },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link to={`/proyectos/${projectId}/cubicaciones`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Cubicaciones'}
        </Link>
        <div className="flex items-start justify-between">
          <div>
          <h1 className="text-2xl font-semibold text-app-text">{contrato.contractor?.name}</h1>
          <p className="text-sm text-app-muted mt-0.5">
            {contrato.contractor?.specialty}
            {contrato.signed_date && <span className="ml-3">· Firmado: {new Date(contrato.signed_date).toLocaleDateString('es-DO')}</span>}
            {adelantosTotal > 0 && <span className="ml-3">· Adelantos: {formatRD(adelantosTotal)}</span>}
          </p>
          {contrato.notes && <p className="text-xs text-app-muted mt-1 italic">{contrato.notes}</p>}
          </div>
          <Link to={`/proyectos/${projectId}/cubicaciones/${contratoId}/imprimir`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover shrink-0">
            <Printer className="w-4 h-4" /> Imprimir
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-app-surface border border-app-border rounded-xl p-4">
            <p className="text-xs text-app-muted">{k.label}</p>
            <p className={`text-xl font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {acordado > 0 && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <div className="flex justify-between text-xs text-app-muted mb-2">
            <span>Avance general</span>
            <span>{Math.min((acumulado / acordado) * 100, 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-app-chip rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min((acumulado / acordado) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <div className="flex border-b border-app-border">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20' : 'text-app-muted hover:text-app-text'}`}>
              {t.icon}
              {t.label}
              {t.count > 0 && <span className="ml-0.5 text-[10px] bg-app-chip text-app-muted px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'partidas' && (
            <PartidaSection contractId={contratoId!} partidas={partidas} cortes={cortes} onRefresh={load} />
          )}
          {tab === 'cortes' && (
            <CorteSection
              contractId={contratoId!}
              projectId={projectId!}
              contractorId={contrato.contractor_id}
              retentionPercent={contrato.retention_percent}
              partidas={partidas}
              cortes={cortes}
              onRefresh={load}
            />
          )}
          {tab === 'adelantos' && (
            <AdelantoSection contractId={contratoId!} adelantos={adelantos} onRefresh={load} />
          )}
        </div>
      </div>
    </div>
  )
}
