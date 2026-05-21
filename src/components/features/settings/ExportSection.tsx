import { useState } from 'react'
import { Database, Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  EXPORTABLE_ENTITIES,
  exportAllToZip,
  triggerBackup,
  type ExportSummary,
} from '@/services/exportService'
import { getErrorMessage } from '@/utils/errors'

export function ExportSection() {
  const { success, error, info } = useToast()
  const [exporting, setExporting] = useState(false)
  const [backupRunning, setBackupRunning] = useState(false)
  const [lastSummary, setLastSummary] = useState<ExportSummary | null>(null)

  async function handleExportCsv() {
    if (exporting) return
    setExporting(true)
    try {
      const summary = await exportAllToZip()
      setLastSummary(summary)
      const ok = summary.entities.filter((e) => !e.error).length
      success(`Export listo: ${summary.zipFilename} (${ok} tablas, ${summary.totalRows} filas)`)
    } catch (err) {
      error(`No se pudo generar el ZIP: ${getErrorMessage(err)}`)
    } finally {
      setExporting(false)
    }
  }

  async function handleBackup() {
    if (backupRunning) return
    setBackupRunning(true)
    try {
      const result = await triggerBackup()
      if (!result.ok) {
        // Placeholder: alert + toast informativo.
        if (typeof window !== 'undefined') window.alert(result.message)
        info('Backup de BD: acción manual requerida')
      } else {
        success('Backup encolado correctamente')
      }
    } catch (err) {
      error(`No se pudo iniciar el backup: ${getErrorMessage(err)}`)
    } finally {
      setBackupRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-medium text-app-text">Exportar datos a CSV</h2>
          <p className="text-sm text-app-muted">
            Descarga un ZIP con un CSV por entidad (proyectos, contratistas,
            proveedores, nóminas, transacciones, etc.). Útil como respaldo
            lógico o para auditoría externa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Generando ZIP...' : 'Exportar todo a CSV'}
          </button>
        </div>
        <details className="text-xs text-app-muted">
          <summary className="cursor-pointer select-none">
            Ver entidades incluidas ({EXPORTABLE_ENTITIES.length})
          </summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
            {EXPORTABLE_ENTITIES.map((e) => (
              <li key={e.table}>{e.table}</li>
            ))}
          </ul>
        </details>
      </div>

      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-medium text-app-text">Backup de base de datos</h2>
          <p className="text-sm text-app-muted">
            El backup binario (pg_dump) requiere credenciales de servidor y se
            ejecuta desde Supabase, no desde el navegador. Este botón mostrará
            las instrucciones para que un administrador lo ejecute.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleBackup}
            disabled={backupRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-app-border bg-app-bg text-app-text hover:bg-app-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {backupRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Backup BD
          </button>
        </div>
      </div>

      {lastSummary && (
        <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-3">
          <h3 className="font-medium text-app-text text-sm">Último export</h3>
          <p className="text-xs text-app-muted">
            Archivo: <span className="font-mono">{lastSummary.zipFilename}</span> · Total:{' '}
            {lastSummary.totalRows} filas
          </p>
          <div className="overflow-hidden rounded-lg border border-app-border">
            <table className="w-full">
              <thead>
                <tr className="bg-app-bg border-b border-app-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
                    Tabla
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">
                    Filas
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {lastSummary.entities.map((entity) => (
                  <tr key={entity.table} className="border-b border-app-border last:border-b-0">
                    <td className="px-3 py-2 text-xs text-app-text font-mono">{entity.table}</td>
                    <td className="px-3 py-2 text-xs text-app-muted text-right">{entity.rows}</td>
                    <td className="px-3 py-2 text-xs">
                      {entity.error ? (
                        <span className="text-red-600">{entity.error}</span>
                      ) : entity.rows === 0 ? (
                        <span className="text-app-subtle">vacía (omitida)</span>
                      ) : (
                        <span className="text-green-600">ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
