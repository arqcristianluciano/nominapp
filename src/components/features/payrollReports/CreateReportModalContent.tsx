import { CreatePayrollForm } from '@/components/features/payroll/CreatePayrollForm'
import type { Project } from '@/types/database'

interface Props {
  projects: Project[]
  selectedProjectId: string
  onProjectChange: (projectId: string) => void
  onCreated: (periodId: string) => void
  onCancel: () => void
}

export function CreateReportModalContent({
  projects,
  selectedProjectId,
  onProjectChange,
  onCreated,
  onCancel,
}: Props) {
  return (
    <div className="space-y-4">
      {projects.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Proyecto</label>
          <select value={selectedProjectId} onChange={(e) => onProjectChange(e.target.value)} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      )}
      {selectedProjectId && (
        <CreatePayrollForm
          key={selectedProjectId}
          projectId={selectedProjectId}
          onCreated={onCreated}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}
