import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import { budgetSpentService } from '@/services/budgetSpentService'
import { getProjectsProgress } from '@/services/cubicationService'
import { calcBudgetSpent, calcCashDisponible, calcTotalCxP } from '@/utils/financialCalculations'
import { round2 } from '@/utils/money'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types/database'
import type { ProjectReport, ReportTotals } from '@/components/features/reports/reportTypes'

export function useProjectReports(projects: Project[]) {
  const { error: toastError } = useToast()
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

        // Subpartidas (budget_items) de todas las categorías y costo imputado por
        // proyecto. Se cargan aquí para que el consolidado calcule el presupuesto y
        // el gasto IGUAL que la pantalla de Presupuesto de cada proyecto:
        //   - Presupuesto de una partida = suma de sus subpartidas si tiene; si no,
        //     el monto de la categoría (budgeted_amount).
        //   - Gasto = transacciones imputadas a la partida + costo imputado
        //     (nóminas, facturas de materiales y salidas de almacén).
        const allCategoryIds = allCategories.map((category) => category.id)
        const [allItems, imputedPerProject] = await Promise.all([
          budgetItemService.getByProjectCategories(allCategoryIds),
          Promise.all(activeProjects.map((project) => budgetSpentService.getImputedCostByCategory(project.id))),
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

        const itemsByCategory = new Map<string, typeof allItems>()
        for (const item of allItems) {
          const list = itemsByCategory.get(item.budget_category_id)
          if (list) list.push(item)
          else itemsByCategory.set(item.budget_category_id, [item])
        }

        const imputedByProject = new Map<string, Record<string, number>>()
        activeProjects.forEach((project, index) => {
          imputedByProject.set(project.id, imputedPerProject[index] ?? {})
        })

        const results: ProjectReport[] = []
        for (const project of activeProjects) {
          const transactions = transactionsByProject.get(project.id) ?? []
          const categories = categoriesByProject.get(project.id) ?? []
          const imputed = imputedByProject.get(project.id) ?? {}

          let presupuesto = 0
          let totalIncurrido = 0
          for (const category of categories) {
            const items = itemsByCategory.get(category.id) ?? []
            const categoryBudget =
              items.length > 0
                ? items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
                : category.budgeted_amount
            presupuesto += categoryBudget
            totalIncurrido += calcBudgetSpent(transactions, category.id) + (imputed[category.id] ?? 0)
          }
          presupuesto = round2(presupuesto)
          totalIncurrido = round2(totalIncurrido)

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
        toastError('No se pudieron cargar los reportes de proyectos.')
      } finally {
        setLoading(false)
      }
    }

    if (projects.length > 0) void loadReports()
    else {
      setReports([])
      setLoading(false)
    }
  }, [projects, toastError])

  const totals = useMemo<ReportTotals>(
    () =>
      reports.reduce(
        (acc, report) => ({
          totalIncurrido: acc.totalIncurrido + report.totalIncurrido,
          presupuesto: acc.presupuesto + report.presupuesto,
          cxp: acc.cxp + report.cxp,
          cashDisponible: acc.cashDisponible + report.cashDisponible,
        }),
        { totalIncurrido: 0, presupuesto: 0, cxp: 0, cashDisponible: 0 },
      ),
    [reports],
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
