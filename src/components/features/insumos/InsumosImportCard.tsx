import { FileSpreadsheet } from 'lucide-react'
import { MercadoExcelUpload } from './MercadoExcelUpload'

export function InsumosImportCard({
  projectId,
  hasExisting,
  onImported,
  onCancel,
}: {
  projectId: string
  hasExisting: boolean
  onImported: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-4 h-4 text-green-600" />
        <h2 className="text-sm font-semibold text-app-text">{hasExisting ? 'Reemplazar presupuesto Mercado' : 'Importar presupuesto Mercado'}</h2>
      </div>
      <MercadoExcelUpload projectId={projectId} hasExisting={hasExisting} onImported={onImported} />
      {hasExisting && <button onClick={onCancel} className="mt-3 text-xs text-app-muted hover:text-app-text">Cancelar</button>}
    </div>
  )
}
