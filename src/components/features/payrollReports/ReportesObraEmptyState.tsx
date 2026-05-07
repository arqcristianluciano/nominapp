import { FileText } from 'lucide-react'

export function ReportesObraEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <FileText className="w-10 h-10 text-app-subtle mx-auto mb-3" />
      <p className="text-app-muted font-medium">No hay reportes registrados</p>
      <button onClick={onCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
        Crear el primer reporte
      </button>
    </div>
  )
}
