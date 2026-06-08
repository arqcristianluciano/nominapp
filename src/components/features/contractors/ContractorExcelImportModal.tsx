import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download } from 'lucide-react'
import { getErrorMessage } from '@/utils/errors'
import { readExcelRowsFromFile } from '@/utils/excel'
import { downloadContractorTemplate } from '@/utils/excelTemplates'
import { parseContractorRows, type ParsedContractorRow } from './parseContractorExcel'

interface Props {
  /** Nombres de contratistas existentes (para detectar duplicados). */
  existingNames: string[]
  onImport: (rows: ParsedContractorRow[]) => Promise<{ created: number; skipped: number }>
  onClose: () => void
}

function ExcelDropZone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-app-border rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
    >
      <Upload className="w-8 h-8 text-app-subtle mx-auto mb-3" />
      <p className="text-sm text-app-muted">Arrastra tu archivo Excel aquí</p>
      <p className="text-xs text-app-subtle mt-1">o haz click para seleccionar (.xlsx, .xls)</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'efectivo',
  check: 'cheque',
  transfer: 'transferencia',
}

function PreviewTable({ rows }: { rows: ParsedContractorRow[] }) {
  return (
    <div className="border border-app-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left font-medium text-app-muted">Nombre</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted hidden md:table-cell">Especialidad</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted hidden md:table-cell">Cédula</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted hidden lg:table-cell">Pago</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-app-border ${row.valid ? 'hover:bg-app-hover' : 'bg-amber-50 dark:bg-amber-950/20'}`}
            >
              <td className="px-3 py-1.5 text-app-text font-medium max-w-[180px] truncate">
                {row.name || <span className="text-app-subtle italic">sin nombre</span>}
              </td>
              <td className="px-3 py-1.5 text-app-muted hidden md:table-cell">
                {row.specialty || <span className="text-app-subtle">—</span>}
              </td>
              <td className="px-3 py-1.5 text-app-muted hidden md:table-cell">
                {row.cedula || <span className="text-app-subtle">—</span>}
              </td>
              <td className="px-3 py-1.5 text-app-muted hidden lg:table-cell">
                {row.payment_method ? (
                  (METHOD_LABEL[row.payment_method] ?? row.payment_method)
                ) : (
                  <span className="text-app-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-1.5">
                {row.valid ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> OK
                  </span>
                ) : (
                  <span className="text-amber-600 text-[10px] leading-tight">{row.error}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ContractorExcelImportModal({ existingNames, onImport, onClose }: Props) {
  const [rows, setRows] = useState<ParsedContractorRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setDone(false)
    setError(null)
    setResult(null)
    try {
      const rawRows = await readExcelRowsFromFile(file)
      const parsed = parseContractorRows(rawRows)
      // Marcar como duplicados los que ya existen en la BD
      const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()))
      const merged: ParsedContractorRow[] = parsed.rows.map((r) => {
        if (r.valid && existingSet.has(r.name.toLowerCase().trim())) {
          return { ...r, valid: false, error: 'Duplicado: ya existe un contratista con este nombre' }
        }
        return r
      })
      setRows(merged)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const handleConfirm = async () => {
    const valid = rows.filter((r) => r.valid)
    if (valid.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const res = await onImport(valid)
      setResult(res)
      setDone(true)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter((r) => r.valid).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-app-surface rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-app-text">Importar contratistas desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-app-subtle hover:text-app-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Instrucciones */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Columnas esperadas (A–G):</p>
              <button
                onClick={() => void downloadContractorTemplate()}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                <Download className="w-3 h-3" /> Descargar plantilla
              </button>
            </div>
            <div className="bg-white dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded overflow-hidden">
              <table className="w-full text-[11px] text-blue-900 dark:text-blue-200">
                <thead>
                  <tr className="bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    <th className="px-2 py-1 text-left font-semibold">A · Nombre *</th>
                    <th className="px-2 py-1 text-left font-semibold">B · Especialidad</th>
                    <th className="px-2 py-1 text-left font-semibold">C · Cédula</th>
                    <th className="px-2 py-1 text-left font-semibold">D · Teléfono</th>
                    <th className="px-2 py-1 text-left font-semibold">E · Banco</th>
                    <th className="px-2 py-1 text-left font-semibold">F · Nº cuenta</th>
                    <th className="px-2 py-1 text-left font-semibold">G · Método pago</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-blue-100 dark:border-blue-800">
                    <td className="px-2 py-1 font-medium">Juan Pérez</td>
                    <td className="px-2 py-1">Albanilería</td>
                    <td className="px-2 py-1">001-1234567-8</td>
                    <td className="px-2 py-1">809-555-1001</td>
                    <td className="px-2 py-1">B. Popular</td>
                    <td className="px-2 py-1">111222333</td>
                    <td className="px-2 py-1">transferencia</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>
                El <strong>Nombre</strong> es el único campo obligatorio (*). Los demás son opcionales.
              </li>
              <li>
                Método de pago: <strong>efectivo</strong>, <strong>cheque</strong> o <strong>transferencia</strong> (o
                deje vacío).
              </li>
              <li>Número de cuenta: solo dígitos, sin guiones ni espacios.</li>
              <li>Contratistas con nombre ya existente serán omitidos automáticamente.</li>
            </ul>
          </div>

          {!rows.length && <ExcelDropZone onFile={(f) => void handleFile(f)} />}

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-app-muted font-medium">{fileName}</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} omitidos
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setRows([])
                    setFileName('')
                    setDone(false)
                    setResult(null)
                  }}
                  className="text-xs text-app-subtle hover:text-app-muted"
                >
                  Cambiar archivo
                </button>
              </div>

              <PreviewTable rows={rows} />
            </>
          )}

          {done && result && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {result.created} {result.created === 1 ? 'contratista creado' : 'contratistas creados'} correctamente
                {result.skipped > 0 && ` · ${result.skipped} omitidos por duplicado`}.
              </span>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-app-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && validCount > 0 && (
            <button
              onClick={() => void handleConfirm()}
              disabled={importing}
              className="px-4 py-2 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importando...' : `Importar ${validCount} contratistas`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
