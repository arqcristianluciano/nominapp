import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Sparkles, Download } from 'lucide-react'
import type { BudgetCategory } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import { readExcelRowsFromFile } from '@/utils/excel'
import {
  parseRows,
  type ImportPayload,
  type NewCategoryDraft,
  type ParsedItem,
} from './parseBudgetExcel'

export type { ImportPayload, NewCategoryDraft, ParsedItem } from './parseBudgetExcel'

interface Props {
  categories: BudgetCategory[]
  onImport: (payload: ImportPayload) => Promise<void>
  onClose: () => void
}

interface ExcelDropZoneProps {
  onFile: (file: File) => void
}

function ExcelDropZone({ onFile }: ExcelDropZoneProps) {
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

interface ImportPreviewTableProps {
  items: ParsedItem[]
}

function ImportPreviewTable({ items }: ImportPreviewTableProps) {
  return (
    <div className="border border-app-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left font-medium text-app-muted">Partida</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted">Cod.</th>
            <th className="px-3 py-2 text-left font-medium text-app-muted">Descripción</th>
            <th className="px-3 py-2 text-center font-medium text-app-muted">Und</th>
            <th className="px-3 py-2 text-right font-medium text-app-muted">Cant.</th>
            <th className="px-3 py-2 text-right font-medium text-app-muted">P. Unit.</th>
            <th className="px-3 py-2 text-right font-medium text-app-muted">Total</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const seenKeys = new Map<string, number>()
            return items.map((row) => {
              const baseKey = `${row.categoryId ?? row.newCategoryKey ?? 'nocat'}-${row.code || 'nocode'}-${row.description}`
              const dup = seenKeys.get(baseKey) ?? 0
              seenKeys.set(baseKey, dup + 1)
              const rowKey = dup === 0 ? baseKey : `${baseKey}#${dup}`
              return (
                <tr
                  key={rowKey}
                  className={`border-b border-app-border ${row.valid ? 'hover:bg-app-hover' : 'bg-amber-50'}`}
                >
                  <td className="px-3 py-1.5 text-app-muted max-w-[160px] truncate">
                    <span>{row.categoryName}</span>
                    {row.isNewCategory && (
                      <span className="ml-1 text-[9px] uppercase tracking-wide text-blue-600 font-semibold">
                        nueva
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-app-subtle font-mono">{row.code}</td>
                  <td className="px-3 py-1.5 text-app-text max-w-[200px] truncate">{row.description}</td>
                  <td className="px-3 py-1.5 text-center text-app-muted">{row.unit}</td>
                  <td className="px-3 py-1.5 text-right text-app-muted">{row.quantity}</td>
                  <td className="px-3 py-1.5 text-right text-app-muted">{formatRD(row.unit_price)}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-app-text">
                    {row.valid ? formatRD(row.quantity * row.unit_price) : (
                      <span className="text-amber-600 text-[10px]">{row.error}</span>
                    )}
                  </td>
                </tr>
              )
            })
          })()}
        </tbody>
      </table>
    </div>
  )
}

interface ImportSummaryFooterProps {
  done: boolean
  validCount: number
  importing: boolean
  onClose: () => void
  onConfirm: () => void
}

function ImportSummaryFooter({ done, validCount, importing, onClose, onConfirm }: ImportSummaryFooterProps) {
  return (
    <div className="flex justify-end gap-2 px-5 py-4 border-t border-app-border">
      <button onClick={onClose} className="px-4 py-2 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
        {done ? 'Cerrar' : 'Cancelar'}
      </button>
      {!done && validCount > 0 && (
        <button
          onClick={onConfirm}
          disabled={importing}
          className="px-4 py-2 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {importing ? 'Importando...' : `Importar ${validCount} subpartidas`}
        </button>
      )}
    </div>
  )
}

export default function ExcelImportModal({ categories, onImport, onClose }: Props) {
  const [items, setItems] = useState<ParsedItem[]>([])
  const [newCategories, setNewCategories] = useState<NewCategoryDraft[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setDone(false)
    setError(null)
    try {
      const rawRows = await readExcelRowsFromFile(file)
      const parsed = parseRows(rawRows, categories)
      setItems(parsed.items)
      setNewCategories(parsed.newCategories)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const aoa: (string | number)[][] = [
      ['Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario'],
      [1, 'PRELIMINARES', '', '', ''],
      ['1.01', 'Campamento', 'pa', 1, 1000000],
      ['1.02', 'Limpieza inicial del terreno', 'm2', 250, 350],
      [2, 'MOVIMIENTO DE TIERRA', '', '', ''],
      ['2.01', 'Corte y bote', 'm3', 1500, 650],
      ['2.02', 'Relleno compactado', 'm3', 800, 750],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 8 }, { wch: 10 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto')
    XLSX.writeFile(wb, 'plantilla-presupuesto.xlsx')
  }

  const handleConfirm = async () => {
    const valid = items.filter((r) => r.valid)
    if (valid.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const payload: ImportPayload = {
        newCategories,
        items: valid.map((r, i) => ({
          budget_category_id: r.categoryId,
          new_category_key: r.newCategoryKey,
          code: r.code || null,
          description: r.description,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          sort_order: i + 1,
          notes: null,
          start_date: null,
          end_date: null,
        })),
      }
      await onImport(payload)
      setDone(true)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setImporting(false)
    }
  }

  const validCount = items.filter((r) => r.valid).length
  const invalidCount = items.filter((r) => !r.valid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-app-surface rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-app-text">Importar presupuesto desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-app-subtle hover:text-app-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Formato esperado (columnas A–E):</p>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                title="Descargar plantilla de ejemplo"
              >
                <Download className="w-3 h-3" /> Descargar plantilla
              </button>
            </div>
            <p>A: Código · B: Descripción · C: Unidad · D: Cantidad · E: Precio unitario</p>
            <div className="bg-white border border-blue-100 rounded overflow-hidden mt-1">
              <table className="w-full text-[11px] text-blue-900">
                <thead>
                  <tr className="bg-blue-100/60 text-blue-700">
                    <th className="px-2 py-1 text-left font-semibold">A · Código</th>
                    <th className="px-2 py-1 text-left font-semibold">B · Descripción</th>
                    <th className="px-2 py-1 text-center font-semibold">C · Unidad</th>
                    <th className="px-2 py-1 text-right font-semibold">D · Cantidad</th>
                    <th className="px-2 py-1 text-right font-semibold">E · P. Unit.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-blue-100 bg-blue-50/60 font-semibold">
                    <td className="px-2 py-1">1</td>
                    <td className="px-2 py-1">PRELIMINARES</td>
                    <td className="px-2 py-1 text-center text-blue-400">—</td>
                    <td className="px-2 py-1 text-right text-blue-400">—</td>
                    <td className="px-2 py-1 text-right text-blue-400">—</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="px-2 py-1">1.01</td>
                    <td className="px-2 py-1">Campamento</td>
                    <td className="px-2 py-1 text-center">pa</td>
                    <td className="px-2 py-1 text-right">1</td>
                    <td className="px-2 py-1 text-right">1,000,000</td>
                  </tr>
                  <tr className="border-t border-blue-100 bg-blue-50/60 font-semibold">
                    <td className="px-2 py-1">2</td>
                    <td className="px-2 py-1">MOVIMIENTO DE TIERRA</td>
                    <td className="px-2 py-1 text-center text-blue-400">—</td>
                    <td className="px-2 py-1 text-right text-blue-400">—</td>
                    <td className="px-2 py-1 text-right text-blue-400">—</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="px-2 py-1">2.01</td>
                    <td className="px-2 py-1">Corte y bote</td>
                    <td className="px-2 py-1 text-center">m3</td>
                    <td className="px-2 py-1 text-right">1,500</td>
                    <td className="px-2 py-1 text-right">650</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-600">
              <li>Las filas <strong>sin Unidad ni Cantidad</strong> se detectan como capítulos (partidas).</li>
              <li>Si el nombre del capítulo no coincide con una partida existente, se crea una nueva automáticamente.</li>
              <li>Las cantidades y precios deben ser numéricos (sin símbolo RD$).</li>
            </ul>
          </div>

          {!items.length && <ExcelDropZone onFile={handleFile} />}

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-app-muted font-medium">{fileName}</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} con errores
                    </span>
                  )}
                  {newCategories.length > 0 && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {newCategories.length} partidas nuevas
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setItems([]); setNewCategories([]); setFileName('') }}
                  className="text-xs text-app-subtle hover:text-app-muted"
                >
                  Cambiar archivo
                </button>
              </div>

              {newCategories.length > 0 && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-medium mb-1">Se crearán estas partidas nuevas:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {newCategories.map((c) => (
                      <li key={c.key}>{c.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ImportPreviewTable items={items} />
            </>
          )}

          {done && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              {validCount} subpartidas importadas correctamente.
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <ImportSummaryFooter
          done={done}
          validCount={validCount}
          importing={importing}
          onClose={onClose}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  )
}
