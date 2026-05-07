import { Plus } from 'lucide-react'

export function ReportesObraHeader({
  periodsCount,
  onCreate,
}: {
  periodsCount: number
  onCreate: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Reportes</h1>
        <p className="text-sm text-app-muted mt-0.5">{periodsCount} reporte{periodsCount !== 1 ? 's' : ''} registrado{periodsCount !== 1 ? 's' : ''}</p>
      </div>
      <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
        <Plus className="w-4 h-4" /> Nuevo reporte
      </button>
    </div>
  )
}
