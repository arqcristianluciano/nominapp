import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { payrollService } from '@/services/payrollService'
import { formatRD, formatNumber } from '@/utils/currency'
import type { PayrollPeriod, LaborLineItem, MaterialInvoice, IndirectCost } from '@/types/database'

interface PayrollDetail {
  period: PayrollPeriod
  laborItems: LaborLineItem[]
  materialInvoices: MaterialInvoice[]
  indirectCosts: IndirectCost[]
}

export default function PayrollPrint() {
  const { periodId } = useParams<{ periodId: string }>()
  const [detail, setDetail] = useState<PayrollDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!periodId) return
    payrollService.getPeriodDetail(periodId)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [periodId])

  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando...</div>
  if (!detail) return <div className="p-8 text-sm text-gray-500">Reporte no encontrado</div>

  const { period, laborItems, materialInvoices, indirectCosts } = detail
  const project = period.project
  const reportDate = new Date(period.report_date).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })

  // Group labor by contractor
  const contractorMap = new Map<string, { name: string; items: LaborLineItem[] }>()
  for (const item of laborItems) {
    const cId = item.contractor_id
    if (!contractorMap.has(cId)) contractorMap.set(cId, { name: item.contractor?.name || 'Desconocido', items: [] })
    contractorMap.get(cId)!.items.push(item)
  }

  return (
    <div>
      {/* Screen-only controls */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <Link to={`/nominas/${periodId}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8 print:p-6 print:max-w-none bg-white">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase">{project?.name || 'Proyecto'}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{project?.location} · {project?.code}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">REPORTE No. {period.period_number}</p>
              <p className="text-sm text-gray-600">{reportDate}</p>
              {period.reported_by && <p className="text-xs text-gray-500 mt-0.5">Reportado por: {period.reported_by}</p>}
            </div>
          </div>
        </div>

        {/* Summary boxes */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Mano de obra', value: period.total_labor || 0 },
            { label: 'Materiales', value: period.total_materials || 0 },
            { label: 'Indirectos', value: period.total_indirect || 0 },
            { label: 'TOTAL GENERAL', value: period.grand_total || 0, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} className={`border rounded p-3 ${bold ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300'}`}>
              <p className={`text-[10px] uppercase tracking-wide ${bold ? 'text-gray-300' : 'text-gray-500'}`}>{label}</p>
              <p className={`text-sm font-bold mt-1 ${bold ? 'text-white' : 'text-gray-900'}`}>{formatRD(value)}</p>
            </div>
          ))}
        </div>

        {/* Labor */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">Mano de Obra</h2>
          {Array.from(contractorMap.values()).map(({ name, items }) => (
            <div key={name} className="mb-4">
              <p className="text-xs font-semibold text-gray-800 mb-1 uppercase">{name}</p>
              <table className="w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Descripción</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 w-16">Cant.</th>
                    <th className="px-2 py-1 text-center font-medium text-gray-600 w-12">Ud.</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 w-24">Precio</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-2 py-1 text-gray-800">{item.description}</td>
                      <td className="px-2 py-1 text-right text-gray-700">{formatNumber(item.quantity)}</td>
                      <td className="px-2 py-1 text-center text-gray-600">{item.unit}</td>
                      <td className="px-2 py-1 text-right text-gray-700">{formatRD(item.unit_price)}</td>
                      <td className="px-2 py-1 text-right font-medium text-gray-900">{formatRD(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="flex justify-end mt-1">
            <span className="text-xs font-semibold text-gray-700 mr-4">Total mano de obra:</span>
            <span className="text-xs font-bold text-gray-900">{formatRD(period.total_labor || 0)}</span>
          </div>
        </section>

        {/* Materials */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">Materiales</h2>
          <table className="w-full text-xs border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1 text-left font-medium text-gray-600">Proveedor</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600">Descripción</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600 w-20">Factura</th>
                <th className="px-2 py-1 text-right font-medium text-gray-600 w-24">Monto</th>
              </tr>
            </thead>
            <tbody>
              {materialInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="px-2 py-1 text-gray-800">{inv.supplier?.name || '—'}</td>
                  <td className="px-2 py-1 text-gray-700">{inv.description}</td>
                  <td className="px-2 py-1 text-gray-500">{inv.invoice_reference || '—'}</td>
                  <td className="px-2 py-1 text-right font-medium text-gray-900">{formatRD(inv.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-1">
            <span className="text-xs font-semibold text-gray-700 mr-4">Total materiales:</span>
            <span className="text-xs font-bold text-gray-900">{formatRD(period.total_materials || 0)}</span>
          </div>
        </section>

        {/* Indirect */}
        {indirectCosts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3">Gastos Indirectos</h2>
            <table className="w-full text-xs border border-gray-200">
              <tbody>
                {indirectCosts.map((cost) => (
                  <tr key={cost.id} className="border-t border-gray-100">
                    <td className="px-2 py-1 text-gray-800">{cost.description}</td>
                    <td className="px-2 py-1 text-right text-gray-500 w-16">{cost.percentage ? `${cost.percentage}%` : 'Fijo'}</td>
                    <td className="px-2 py-1 text-right font-medium text-gray-900 w-24">{formatRD(cost.calculated_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Grand total */}
        <div className="border-t-2 border-gray-800 pt-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total general</p>
            <p className="text-2xl font-bold text-gray-900">{formatRD(period.grand_total || 0)}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          {['Elaborado por', 'Revisado por', 'Aprobado por'].map((label) => (
            <div key={label} className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-[10px] text-gray-500 uppercase">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
