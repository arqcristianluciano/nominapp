export function AttendanceSummaryCards({
  todayWorkers,
  todayHours,
  totalRecords,
}: {
  todayWorkers: number
  todayHours: number
  totalRecords: number
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted mb-1">Personal hoy</p><p className="text-2xl font-bold text-app-text">{todayWorkers}</p><p className="text-xs text-app-subtle mt-0.5">trabajadores</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted mb-1">Horas hoy</p><p className="text-2xl font-bold text-app-text">{todayHours}</p><p className="text-xs text-app-subtle mt-0.5">horas-hombre</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted mb-1">Total registros</p><p className="text-2xl font-bold text-app-text">{totalRecords}</p><p className="text-xs text-app-subtle mt-0.5">en este proyecto</p></div>
    </div>
  )
}
