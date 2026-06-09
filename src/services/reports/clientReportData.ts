/**
 * Client report data loader.
 *
 * Assembles the {@link ClientReportInput} required by {@link generateClientReport}
 * for a given project. This loader deliberately fetches ONLY the data that is
 * appropriate for external (client / investor) consumption:
 *
 *  - Project name and client name (from the project record).
 *  - Overall construction progress (weighted average from schedule tasks).
 *  - High-level financial summary: total budget vs. executed, % spent.
 *    - Executed amount comes from committed payrolls only (grand_total).
 *    - Deposits (category code "19 - DEPOSITOS") are excluded.
 *  - Schedule milestones (tasks where is_milestone === true).
 *  - Optionally: up to MAX_CLIENT_PHOTOS signed URLs from the bitácora.
 *
 * DATA EXPLICITLY NOT LOADED (internal / sensitive):
 *  - Contractor payroll detail (names, amounts, bank data).
 *  - Supplier rates and unit cost breakdowns.
 *  - Indirect cost percentages (DT, admin, transport).
 *  - Variance analysis at partida level.
 *  - Raw transaction list.
 */

import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { scheduleService } from '@/services/scheduleService'
import { transactionService } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import type { ClientReportInput, ClientReportMilestone } from '@/services/reports/sections/clientReport'
import { MAX_CLIENT_PHOTOS } from '@/services/reports/sections/clientReport'

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

const DEPOSIT_CODE = '19 - DEPOSITOS'

/**
 * Calculates the total budget for a project by summing category budgets
 * (derived from their items when available, otherwise from `budgeted_amount`).
 * This matches the calculation in monthlyReportData.ts.
 */
async function loadTotalBudget(projectId: string): Promise<number> {
  const categories = await budgetCategoryService.getByProject(projectId)
  const categoryIds = categories.map((c) => c.id)
  const items = await budgetItemService.getByProjectCategories(categoryIds)

  const itemsByCategory = new Map<string, { quantity: number; unitPrice: number }[]>()
  for (const item of items) {
    const bucket = itemsByCategory.get(item.budget_category_id) ?? []
    bucket.push({
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
    })
    itemsByCategory.set(item.budget_category_id, bucket)
  }

  return categories.reduce((acc, cat) => {
    const catItems = itemsByCategory.get(cat.id) ?? []
    const fromItems = catItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
    return acc + (fromItems > 0 ? fromItems : Number(cat.budgeted_amount ?? 0))
  }, 0)
}

/**
 * Loads committed payroll total invested.
 * Matches the logic in monthlyReportData.ts: sum of grand_total for committed periods.
 */
async function loadTotalInvested(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('grand_total, status')
    .eq('project_id', projectId)
    .in('status', COMMITTED_PAYROLL_STATUSES)
  if (error) {
    console.warn('[clientReportData] loadTotalInvested failed:', error.message)
    return 0
  }
  return (data ?? []).reduce((acc, p) => acc + Number(p.grand_total ?? 0), 0)
}

/**
 * Loads transactions total excluding deposits.
 * Matches the logic in monthlyReportData.ts.
 */
async function loadTransactionsTotal(projectId: string): Promise<number> {
  const transactions = await transactionService.getByProject(projectId)
  return transactions
    .filter((t) => t.budget_category?.code !== DEPOSIT_CODE)
    .reduce((acc, t) => acc + Number(t.total ?? 0), 0)
}

/**
 * Builds the list of milestones from schedule tasks.
 * Only tasks with `is_milestone === true` are included.
 */
async function loadMilestones(projectId: string): Promise<ClientReportMilestone[]> {
  const tasks = await scheduleService.getByProject(projectId)
  const today = new Date().toISOString().split('T')[0]
  return tasks
    .filter((t) => t.is_milestone)
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
    .map((t) => ({
      name: t.name,
      endDate: t.end_date,
      progress: t.progress,
      completed: t.progress >= 100,
      // Atrasado: paso su fecha planificada pero no esta terminado.
      overdue: t.progress < 100 && t.end_date < today,
    }))
}

/**
 * Fetches signed URLs for recent bitácora photos (up to MAX_CLIENT_PHOTOS).
 * Photos are ordered newest-first by upload date.
 * Returns base64 data URLs so they embed in the PDF without expiry concerns.
 * On any fetch error the photo is silently skipped.
 */
async function loadRecentPhotos(projectId: string): Promise<string[]> {
  // 1) Get recent bitácora entries for this project (newest first).
  const { data: entries, error: entryError } = await supabase
    .from('bitacora_entries')
    .select('id')
    .eq('project_id', projectId)
    .order('date', { ascending: false })
    .limit(20)

  if (entryError || !entries?.length) return []

  const entryIds = entries.map((e) => e.id)

  // 2) Get photos from bitacora_photos (ordered newest first).
  const { data: photoRows, error: photoError } = await supabase
    .from('bitacora_photos')
    .select('storage_path')
    .in('bitacora_id', entryIds)
    .order('uploaded_at', { ascending: false })
    .limit(MAX_CLIENT_PHOTOS)

  if (photoError || !photoRows?.length) return []

  // 3) Generate signed URLs and convert each to a base64 data URL for embedding.
  const urlResults = await Promise.allSettled(
    photoRows.map(async (row) => {
      const { data, error } = await supabase.storage.from('bitacora-photos').createSignedUrl(row.storage_path, 3600)
      if (error || !data?.signedUrl) throw new Error('No URL')

      // Fetch the image and convert to base64 for PDF embedding.
      const response = await fetch(data.signedUrl)
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }),
  )

  return urlResults.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map((r) => r.value)
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Options to customize the client report.
 */
export interface ClientReportOptions {
  /**
   * Whether to include recent site photos from the bitácora.
   * Defaults to false to keep the report lightweight.
   */
  includePhotos?: boolean
}

/**
 * Loads the data required to render a client-facing project report.
 *
 * Only performs read-only queries. The result is suitable for
 * {@link generateClientReport} in `pdfReportService.ts`.
 *
 * @param projectId The project UUID.
 * @param options   Optional customisation (e.g. whether to include photos).
 */
export async function loadClientReportData(
  projectId: string,
  options: ClientReportOptions = {},
): Promise<ClientReportInput> {
  const [project, totalBudget, totalInvested, transactionsTotal, milestones] = await Promise.all([
    projectService.getById(projectId),
    loadTotalBudget(projectId),
    loadTotalInvested(projectId),
    loadTransactionsTotal(projectId),
    loadMilestones(projectId),
  ])

  const projectGrandTotal = totalInvested + transactionsTotal
  const percentSpent = totalBudget > 0 ? Math.min(100, (projectGrandTotal / totalBudget) * 100) : 0

  // Overall progress from schedule tasks (weighted by duration).
  const tasks = await scheduleService.getByProject(projectId)
  const overallProgress = scheduleService.getOverallProgress(tasks)

  // Optionally load photos.
  const photos = options.includePhotos ? await loadRecentPhotos(projectId) : []

  return {
    projectName: project.name,
    clientName: project.company?.name,
    companyName: project.company?.name,
    generatedAt: new Date(),
    overallProgress,
    financial: {
      totalBudget,
      totalInvested: projectGrandTotal,
      percentSpent,
    },
    milestones,
    photos,
  }
}
