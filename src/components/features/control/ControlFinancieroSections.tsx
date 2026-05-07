import { Link } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { formatRD } from '@/utils/currency'
import type { Project } from '@/types/database'

export type ControlTab = 'diario' | 'cxp' | 'cheques'

export function ControlFinancieroHeader({
  project,
  projectId,
}: {
  project: Project
  projectId: string
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: project.name, to: `/proyectos/${projectId}` }, { label: 'Control Financiero' }]} />
      <h1 className="text-2xl font-bold text-app-text">Control Financiero</h1>
      <p className="text-sm text-app-muted mt-0.5">{project.name} · {project.code}</p>
    </div>
  )
}

export function ControlFinancieroTabBar({
  activeTab,
  totalCxP,
  onChange,
}: {
  activeTab: ControlTab
  totalCxP: number
  onChange: (tab: ControlTab) => void
}) {
  const tabs: { key: ControlTab; label: string }[] = [
    { key: 'diario', label: 'Libro Diario' },
    { key: 'cxp', label: `CxP (${formatRD(totalCxP)})` },
    { key: 'cheques', label: 'Cheques y Efectivo' },
  ]
  return <div className="flex items-center justify-between border-b border-app-border"><div className="flex gap-0">{tabs.map((tab) => <button key={tab.key} onClick={() => onChange(tab.key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-app-muted hover:text-app-text'}`}>{tab.label}</button>)}</div></div>
}

export function ControlFinancieroCxpNotice({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-xs">
      <span className="text-app-muted">Aquí solo ves este proyecto. Para filtrar o comparar otras obras abre el consolidado:</span>
      <Link to={`/cxp/${projectId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface rounded-sm shrink-0">Cuentas por Pagar (filtrar por proyecto)</Link>
    </div>
  )
}
