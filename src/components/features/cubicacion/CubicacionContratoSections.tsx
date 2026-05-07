import { Banknote, FileSignature, FileText, Printer, Scissors, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatRD } from '@/utils/currency'
import type { ContractWithContractor } from '@/services/cubicationService'

export type CubicacionTab = 'partidas' | 'cortes' | 'adelantos' | 'prestamos'

export function CubicacionContratoHeader({
  projectId,
  contratoId,
  projectName,
  contrato,
  adelantosTotal,
}: {
  projectId: string
  contratoId: string
  projectName: string
  contrato: ContractWithContractor
  adelantosTotal: number
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Cubicaciones', to: `/proyectos/${projectId}/cubicaciones` }, { label: contrato.contractor?.name ?? 'Contrato' }]} />
      <div className="flex items-start justify-between"><div><h1 className="text-2xl font-semibold text-app-text">{contrato.contractor?.name}</h1><p className="text-sm text-app-muted mt-0.5">{contrato.contractor?.specialty}{contrato.signed_date && <span className="ml-3">· Firmado: {new Date(contrato.signed_date).toLocaleDateString('es-DO')}</span>}{adelantosTotal > 0 && <span className="ml-3">· Adelantos: {formatRD(adelantosTotal)}</span>}</p>{contrato.notes && <p className="text-xs text-app-muted mt-1 italic">{contrato.notes}</p>}</div><div className="flex items-center gap-2 shrink-0"><Link to={`/proyectos/${projectId}/cubicaciones/${contratoId}/contrato`} className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700"><FileSignature className="w-4 h-4" /> Generar contrato</Link><Link to={`/proyectos/${projectId}/cubicaciones/${contratoId}/imprimir`} className="flex items-center gap-2 px-3 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"><Printer className="w-4 h-4" /> Reporte</Link></div></div>
    </div>
  )
}

export function CubicacionContratoKpis({
  acordado,
  acumulado,
  pendiente,
  retenido,
  retentionPercent,
}: {
  acordado: number
  acumulado: number
  pendiente: number
  retenido: number
  retentionPercent: number
}) {
  const kpis = [
    { label: 'Acordado (A)', value: formatRD(acordado), color: 'text-app-text' },
    { label: 'Acumulado (B)', value: formatRD(acumulado), color: 'text-blue-700' },
    { label: 'Pendiente (A-B)', value: formatRD(pendiente), color: pendiente >= 0 ? 'text-green-700' : 'text-red-600' },
    { label: `Retenido (${retentionPercent}%)`, value: formatRD(retenido), color: 'text-amber-700' },
  ]
  return <div className="grid grid-cols-4 gap-3">{kpis.map((kpi) => <div key={kpi.label} className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted">{kpi.label}</p><p className={`text-xl font-semibold mt-1 ${kpi.color}`}>{kpi.value}</p></div>)}</div>
}

export function CubicacionContratoProgress({ acordado, acumulado }: { acordado: number; acumulado: number }) {
  if (acordado <= 0) return null
  const progress = Math.min((acumulado / acordado) * 100, 100)
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4">
      <div className="flex justify-between text-xs text-app-muted mb-2"><span>Avance general</span><span>{progress.toFixed(1)}%</span></div>
      <div className="h-2 bg-app-chip rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
    </div>
  )
}

export function CubicacionContratoTabs({
  tab,
  partidasCount,
  cortesCount,
  adelantosCount,
  onChange,
}: {
  tab: CubicacionTab
  partidasCount: number
  cortesCount: number
  adelantosCount: number
  onChange: (tab: CubicacionTab) => void
}) {
  const tabs = [
    { id: 'partidas' as CubicacionTab, label: 'Partidas', icon: <FileText className="w-3.5 h-3.5" />, count: partidasCount },
    { id: 'cortes' as CubicacionTab, label: 'Cortes', icon: <Scissors className="w-3.5 h-3.5" />, count: cortesCount },
    { id: 'adelantos' as CubicacionTab, label: 'Avances', icon: <Wallet className="w-3.5 h-3.5" />, count: adelantosCount },
    { id: 'prestamos' as CubicacionTab, label: 'Préstamos', icon: <Banknote className="w-3.5 h-3.5" />, count: 0 },
  ]
  return <div className="flex border-b border-app-border">{tabs.map((item) => <button key={item.id} onClick={() => onChange(item.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${tab === item.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20' : 'text-app-muted hover:text-app-text'}`}>{item.icon}{item.label}{item.count > 0 && <span className="ml-0.5 text-[10px] bg-app-chip text-app-muted px-1.5 py-0.5 rounded-full">{item.count}</span>}</button>)}</div>
}
