import type { Project } from '@/types/database'

export type ProjectLite = Pick<Project, 'id' | 'name' | 'code'> & { location?: string | null }

export interface LaborItem {
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

export interface Cubication {
  id: string
  specialty: string
  adjusted_budget: number
  total_advanced: number
  completion_percent: number
  remaining: number
  project_id: string
}

export interface ProjectSummary {
  id: string
  name: string
  code: string
  total: number
  periods: Set<string>
}

export const PAYROLL_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'En revisión',
  approved: 'Aprobada',
  paid: 'Pagada',
}

export const PAYROLL_STATUS_COLOR: Record<string, string> = {
  draft: 'bg-app-chip text-app-muted',
  submitted: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  paid: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  check: 'Cheque',
  transfer: 'Transferencia',
}

export function buildProjectSummary(
  billableItems: LaborItem[],
  projectMap: Record<string, ProjectLite>
): Record<string, ProjectSummary> {
  const byProject: Record<string, ProjectSummary> = {}

  for (const item of billableItems) {
    const projectId = item.payroll_period?.project_id
    if (!projectId) continue
    const project = item.project || projectMap[projectId]

    if (!byProject[projectId]) {
      byProject[projectId] = {
        id: projectId,
        name: project?.name || projectId,
        code: project?.code || '',
        total: 0,
        periods: new Set(),
      }
    }

    byProject[projectId].total += item.subtotal
    if (item.payroll_period?.id) byProject[projectId].periods.add(item.payroll_period.id)
  }

  return byProject
}
