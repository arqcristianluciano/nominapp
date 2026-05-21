import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { getProjectsProgress } from '@/services/cubicationService'
import { calcCashDisponible, calcTotalCxP, calcTotalIncurrido } from '@/utils/financialCalculations'
import type { Project } from '@/types/database'
import type { ProjectReport, ReportTotals } from '@/components/features/reports/reportTypes'

export function useProjectReports(projects: Project[]) {
  const [reports, setReports] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      const activeProjects = projects.filter((project) => project.status === 'active')
      if (activeProjects.length === 0) {
        setReports([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const projectIds = activeProjects.map((project) => project.id)
        const [cubProgress, allTransactions, allCategories] = await Promise.all([
          getProjectsProgress(),
          transactionService.getByProjects(projectIds),
          budgetCategoryService.getByProjects(projectIds),
        ])

        const transactionsByProject = new Map<string, typeof allTransactions>()
        for (const tx of allTransactions) {
          const list = transactionsByProject.get(tx.project_id)
          if (list) list.push(tx)
          else transactionsByProject.set(tx.project_id, [tx])
        }

        const categoriesByProject = new Map<string, typeof allCategories>()
        for (const category of allCategories) {
          const list = categoriesByProject.get(category.project_id)
          if (list) list.push(category)
          else categoriesByProject.set(category.project_id, [category])
        }

        const results: ProjectReport[] = []
        for (const project of activeProjects) {
          const transactions = transactionsByProject.get(project.id) ?? []
          const categories = categoriesByProject.get(project.id) ?? []
          const totalIncurrido = calcTotalIncurrido(transactions)
          const presupuesto = categories.reduce((sum, category) => sum + category.budgeted_amount, 0)
          const cub = cubProgress[project.id] ?? { acordado: 0, acumulado: 0, avg_completion: 0 }
          results.push({
            id: project.id,
            name: project.name,
            code: project.code,
            totalIncurrido,
            presupuesto,
            cxp: calcTotalCxP(transactions),
            cashDisponible: calcCashDisponible(transactions),
            avance: Math.min(presupuesto > 0 ? (totalIncurrido / presupuesto) * 100 : 0, 100),
            acordado: cub.acordado,
            acumulado: cub.acumulado,
            pendiente: cub.acordado - cub.acumulado,
            avgCompletion: cub.avg_completion,
          })
        }
        setReports(results)
      } catch (err) {
        console.error('useProjectReports loadReports failed', err)
      } finally {
        setLoading(false)
      }
    }

    if (projects.length > 0) void loadReports()
    else {
      setReports([])
      setLoading(false)
    }
  }, [projects])

  const totals = useMemo<ReportTotals>(
    () =>
      reports.reduce(
        (acc, report) => ({
          totalIncurrido: acc.totalIncurrido + report.totalIncurrido,
          presupuesto: acc.presupuesto + report.presupuesto,
          cxp: acc.cxp + report.cxp,
          cashDisponible: acc.cashDisponible + report.cashDisponible,
        }),
        { totalIncurrido: 0, presupuesto: 0, cxp: 0, cashDisponible: 0 }
      ),
    [reports]
  )

  async function exportToExcel() {
    const rows = reports.map((report) => ({
      Proyecto: report.name,
      Codigo: report.code,
      'Total incurrido (RD$)': report.totalIncurrido,
      'Presupuesto (RD$)': report.presupuesto,
      '% Avance financiero': `${report.avance.toFixed(1)}%`,
      'CxP (RD$)': report.cxp,
      'Cash disponible (RD$)': report.cashDisponible,
      'Acordado cubicaciones (RD$)': report.acordado,
      'Acumulado cubicaciones (RD$)': report.acumulado,
      'Pendiente cubicaciones (RD$)': report.pendiente,
      '% Avance cubicaciones': `${report.avgCompletion.toFixed(1)}%`,
    }))

    rows.push({
      Proyecto: 'TOTALES',
      Codigo: '',
      'Total incurrido (RD$)': totals.totalIncurrido,
      'Presupuesto (RD$)': totals.presupuesto,
      '% Avance financiero': '',
      'CxP (RD$)': totals.cxp,
      'Cash disponible (RD$)': totals.cashDisponible,
      'Acordado cubicaciones (RD$)': 0,
      'Acumulado cubicaciones (RD$)': 0,
      'Pendiente cubicaciones (RD$)': 0,
      '% Avance cubicaciones': '',
    })

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Financiero')
    XLSX.writeFile(wb, `resumen-financiero-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return { reports, totals, loading, exportToExcel }
}
