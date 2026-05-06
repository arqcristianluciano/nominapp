import { FileText } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { LaborItem } from './detailTypes'
import { PAYROLL_STATUS_COLOR, PAYROLL_STATUS_LABEL } from './detailTypes'

export function ContractorLaborItemsTable({ items, totalPaid }: { items: LaborItem[]; totalPaid: number }) {
  if (items.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-app-subtle" /> Detalle de reportes</h2>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-bg border-b border-app-border">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted">Descripción</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden md:table-cell">Proyecto</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden sm:table-cell">Fecha</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-app-muted hidden sm:table-cell">Estado</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-app-muted">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {items.map((item) => (
              <tr key={item.id} className={item.is_advance_deduction ? 'opacity-50' : ''}>
                <td className="px-4 py-2.5"><p className="text-xs text-app-text">{item.description}</p>{item.is_advance && <span className="text-[10px] text-amber-600">Adelanto</span>}{item.is_advance_deduction && <span className="text-[10px] text-red-500">Deducción</span>}</td>
                <td className="px-4 py-2.5 hidden md:table-cell"><p className="text-xs text-app-muted truncate max-w-32">{item.project?.name || '—'}</p></td>
                <td className="px-4 py-2.5 hidden sm:table-cell"><p className="text-xs text-app-muted">{item.payroll_period?.report_date || '—'}</p></td>
                <td className="px-4 py-2.5 hidden sm:table-cell">{item.payroll_period?.status && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PAYROLL_STATUS_COLOR[item.payroll_period.status]}`}>{PAYROLL_STATUS_LABEL[item.payroll_period.status]}</span>}</td>
                <td className={`px-4 py-2.5 text-right text-xs font-medium ${item.is_advance_deduction ? 'text-red-500' : 'text-app-text'}`}>{item.is_advance_deduction ? '-' : ''}{formatRD(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-app-bg border-t border-app-border">
            <tr><td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-app-muted">Total cobrado</td><td className="px-4 py-2.5 text-right text-sm font-bold text-app-text">{formatRD(totalPaid)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
