import { CheckCircle2, Clock, XCircle } from 'lucide-react'

export function QualityStatsCards({
  passed,
  failed,
  pending,
}: {
  passed: number
  failed: number
  pending: number
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-center"><CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" /><p className="text-xl sm:text-2xl font-bold text-green-700">{passed}</p><p className="text-xs text-green-600">Aprobados</p></div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center"><XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" /><p className="text-xl sm:text-2xl font-bold text-red-700">{failed}</p><p className="text-xs text-red-600">Fallidos</p></div>
      <div className="bg-app-bg border border-app-border rounded-xl p-3 sm:p-4 text-center"><Clock className="w-5 h-5 text-app-subtle mx-auto mb-1" /><p className="text-xl sm:text-2xl font-bold text-app-muted">{pending}</p><p className="text-xs text-app-muted">Pendientes</p></div>
    </div>
  )
}
