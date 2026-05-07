import { CalendarClock, CheckCircle2, Clock, FlaskConical, Pencil, Trash2, XCircle } from 'lucide-react'
import type { QualityControl } from '@/types/database'
import { calcExpectedTestDate, daysUntilTest } from './qualityUtils'

function StatusBadge({ status }: { status: QualityControl['status'] }) {
  if (status === 'passed') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 className="w-3 h-3" />Aprobado</span>
  if (status === 'failed') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700"><XCircle className="w-3 h-3" />Fallido</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-app-chip text-app-muted"><Clock className="w-3 h-3" />Pendiente</span>
}

export function QualityRecordsTable({
  loading,
  records,
  onCreate,
  onEdit,
  onDelete,
}: {
  loading: boolean
  records: QualityControl[]
  onCreate: () => void
  onEdit: (record: QualityControl) => void
  onDelete: (recordId: string) => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando ensayos...</div>
  if (records.length === 0) return <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center"><FlaskConical className="w-10 h-10 text-app-subtle mx-auto mb-3" /><p className="text-app-muted">No hay ensayos registrados</p><button onClick={onCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Registrar primer ensayo</button></div>

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-bg border-b border-app-border"><th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Elemento</th><th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Colada</th><th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Edad</th><th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Fecha ensayo</th><th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Esperada</th><th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Real</th><th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Proveedor</th><th className="px-3 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase">Estado</th><th className="w-16" /></tr></thead>
        <tbody className="divide-y divide-app-border">
          {records.map((record) => {
            const expectedDate = calcExpectedTestDate(record.pour_date, record.test_age)
            const daysLeft = !record.status ? daysUntilTest(record.pour_date, record.test_age) : null
            return (
              <tr key={record.id} className="hover:bg-app-hover">
                <td className="px-3 py-2.5 font-medium text-app-text text-xs">{record.element}</td>
                <td className="px-3 py-2.5 text-app-muted text-xs">{new Date(record.pour_date).toLocaleDateString('es-DO')}</td>
                <td className="px-3 py-2.5 text-app-muted text-xs hidden sm:table-cell">{record.test_age || '—'}</td>
                <td className="px-3 py-2.5 text-xs hidden lg:table-cell">{expectedDate ? <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 ? 'text-amber-600 font-medium' : daysLeft !== null && daysLeft < 0 ? 'text-red-600 font-medium' : 'text-app-muted'}`}><CalendarClock className="w-3 h-3" />{expectedDate}{daysLeft !== null && daysLeft <= 7 && <span className="text-[10px]">({daysLeft < 0 ? `${Math.abs(daysLeft)}d vencido` : `en ${daysLeft}d`})</span>}</span> : '—'}</td>
                <td className="px-3 py-2.5 text-app-muted text-xs text-right">{record.expected_resistance ? `${record.expected_resistance} kg/cm²` : '—'}</td>
                <td className={`px-3 py-2.5 text-xs font-semibold text-right ${record.status === 'failed' ? 'text-red-600' : record.status === 'passed' ? 'text-green-600' : 'text-app-subtle'}`}>{record.actual_resistance ? `${record.actual_resistance} kg/cm²` : '—'}</td>
                <td className="px-3 py-2.5 text-app-muted text-xs hidden md:table-cell">{record.concrete_supplier || '—'}</td>
                <td className="px-3 py-2.5 text-center"><StatusBadge status={record.status} /></td>
                <td className="px-2 py-2.5"><div className="flex items-center gap-1"><button onClick={() => onEdit(record)} className="p-1 text-app-subtle hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => onDelete(record.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
