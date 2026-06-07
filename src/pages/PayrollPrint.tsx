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
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!periodId) return
    Promise.all([payrollService.getPeriodDetail(periodId), loanService.getDeductionsByPeriod(periodId)])
      .then(([periodDetail, loanDeductions]) => setDetail({ ...periodDetail, loanDeductions }))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [periodId])

  if (loading) return <div className="p-8 text-sm text-app-muted">Cargando...</div>
  if (loadError || !detail) return <div className="p-8 text-sm text-app-muted">No se pudo cargar el reporte</div>

  const { period, laborItems, materialInvoices, indirectCosts, loanDeductions } = detail

  return (
    <div>
      {/* ready=true solo cuando los datos cargaron; evita que auto-print dispare en página vacía */}
      <PayrollPrintTopBar periodId={periodId!} ready={!loading && !!detail} />

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
