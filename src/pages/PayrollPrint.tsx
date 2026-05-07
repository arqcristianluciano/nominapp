import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { payrollService } from '@/services/payrollService'
import { loanService } from '@/services/loanService'
import type { PayrollPrintDetail } from '@/components/features/payroll-print/payrollPrintTypes'
import {
  PayrollPrintFooter,
  PayrollPrintHeader,
  PayrollPrintIndirect,
  PayrollPrintLabor,
  PayrollPrintLoanDeductions,
  PayrollPrintMaterials,
  PayrollPrintSummary,
  PayrollPrintTopBar,
} from '@/components/features/payroll-print/PayrollPrintSections'

export default function PayrollPrint() {
  const { periodId } = useParams<{ periodId: string }>()
  const [detail, setDetail] = useState<PayrollPrintDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!periodId) return
    Promise.all([
      payrollService.getPeriodDetail(periodId),
      loanService.getDeductionsByPeriod(periodId),
    ]).then(([detail, loanDeductions]) => setDetail({ ...detail, loanDeductions }))
      .finally(() => setLoading(false))
  }, [periodId])

  if (loading) return <div className="p-8 text-sm text-app-muted">Cargando...</div>
  if (!detail) return <div className="p-8 text-sm text-app-muted">Reporte no encontrado</div>

  const { period, laborItems, materialInvoices, indirectCosts, loanDeductions } = detail

  return (
    <div>
      <PayrollPrintTopBar periodId={periodId!} />

      <div className="max-w-4xl mx-auto p-8 print:p-6 print:max-w-none bg-app-surface">
        <PayrollPrintHeader period={period} />
        <PayrollPrintSummary period={period} />
        <PayrollPrintLabor laborItems={laborItems} totalLabor={period.total_labor || 0} />
        <PayrollPrintMaterials materialInvoices={materialInvoices} totalMaterials={period.total_materials || 0} />
        <PayrollPrintLoanDeductions deductions={loanDeductions} />
        <PayrollPrintIndirect indirectCosts={indirectCosts} />
        <PayrollPrintFooter grandTotal={period.grand_total || 0} />
      </div>
    </div>
  )
}
