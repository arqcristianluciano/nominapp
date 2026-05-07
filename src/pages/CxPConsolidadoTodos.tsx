import { useMemo } from 'react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { CxPProjectFilterBar } from '@/components/features/control/CxPProjectFilterBar'
import {
  CxPConsolidadoEmpty,
  CxPConsolidadoGroups,
  CxPConsolidadoSummary,
} from '@/components/features/control/CxPConsolidadoSections'
import { useCxPConsolidadoTodos } from '@/hooks/useCxPConsolidadoTodos'

export default function CxPConsolidadoTodos() {
  const {
    groups,
    loading,
    projectFilter,
    activeProjects,
    displayedGroups,
    displayedTotal,
    filteredProjectName,
    setProjectFilter,
  } = useCxPConsolidadoTodos()

  const subtitle = useMemo(
    () =>
      projectFilter === 'all'
        ? 'Todas las obras con saldo pendiente'
        : `Filtrado: ${filteredProjectName ?? '—'}`,
    [projectFilter, filteredProjectName]
  )

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[
          { label: 'Cuentas por pagar', to: '/cxp' },
          { label: 'Consolidado' },
        ]} />
        <h1 className="text-2xl font-semibold text-app-text">CxP consolidado</h1>
        <p className="text-sm text-app-muted mt-1">{subtitle}</p>
      </div>

      <CxPProjectFilterBar value={projectFilter} onChange={setProjectFilter} activeProjects={activeProjects} />

      <CxPConsolidadoSummary
        projectFilter={projectFilter}
        displayedTotal={displayedTotal}
        groupsCount={groups.length}
        displayedCount={displayedGroups.length}
      />

      {loading ? (
        <div className="text-sm text-app-muted">Cargando cuentas por pagar...</div>
      ) : groups.length === 0 ? (
        <CxPConsolidadoEmpty filteredProjectName={null} />
      ) : displayedGroups.length === 0 ? (
        <CxPConsolidadoEmpty filteredProjectName={filteredProjectName} />
      ) : (
        <CxPConsolidadoGroups groups={displayedGroups} />
      )}
    </div>
  )
}
