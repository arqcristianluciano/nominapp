import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import { formatRD } from '@/utils/currency'

interface ParsedRow {
  categoryId: string
  categoryName: string
  code: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  valid: boolean
  error?: string
}

interface Props {
  categories: BudgetCategory[]
  onImport: (items: Omit<BudgetItem, 'id'>[]) => Promise<void>
  onClose: () => void
}

function matchCategory(categories: BudgetCategory[], rawCode: string, desc: string): BudgetCategory | null {
  const code = rawCode?.toString().trim()
  const name = desc?.toString().trim().toLowerCase()
  return categories.find((c) =>
    c.sort_order.toString() === code ||
    c.code.toLowerCase().includes(name) ||
    c.name.toLowerCase().includes(name)
  ) ?? null
}

function parseSheet(sheet: XLSX.WorkSheet, categories: BudgetCategory[]): ParsedRow[] {
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' })
  const parsed: ParsedRow[] = []
  let currentCategory: BudgetCategory | null = null

  for (const row of rows) {
    const [colA, colB, colC, colD, colE] = row.map((v: any) => String(v ?? '').trim())
    if (!colA && !colB) continue

    const qty = parseFloat(colD.replace(/,/g, '.'))
    const price = parseFloat(colE.replace(/,/g, '.'))
    const isSubpartida = colC && !isNaN(qty) && qty > 0

    if (!isSubpartida) {
      // Es cabecera de partida
      const matched = matchCategory(categories, colA, colB || colA)
      if (matched) currentCategory = matched
      continue
    }

    if (!currentCategory) {
      parsed.push({
        categoryId: '', categoryName: 'Sin partida',
        code: colA, description: colB, unit: colC,
        quantity: qty, unit_price: isNaN(price) ? 0 : price,
        valid: false, error: 'No se detectó partida principal',
      })
      continue
    }

    parsed.push({
      categoryId: currentCategory.id,
      categoryName: currentCategory.name,
      code: colA,
      description: colB,
      unit: colC,
      quantity: qty,
      unit_price: isNaN(price) ? 0 : price,
      valid: true,
    })
  }

  return parsed
}

export default function ExcelImportModal({ categories, onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    setDone(false)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const parsed = parseSheet(ws, categories)
        setRows(parsed)
      } catch {
        setError('No se pudo leer el archivo. Verifique que sea un Excel válido.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = async () => {
    const valid = rows.filter((r) => r.valid)
    if (valid.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const items: Omit<BudgetItem, 'id'>[] = valid.map((r, i) => ({
        budget_category_id: r.categoryId,
        code: r.code || null,
        description: r.description,
        unit: r.unit,
        quantity: r.quantity,
        unit_price: r.unit_price,
        sort_order: i + 1,
        notes: null,
      }))
      await onImport(items)
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter((r) => r.valid).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">Importar presupuesto desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <p className="font-medium">Formato esperado (columnas A–E):</p>
            <p>A: Código · B: Descripción · C: Unidad · D: Cantidad · E: Precio unitario</p>
            <p className="text-blue-500">Las filas sin Unidad/Cantidad se detectan como cabeceras de partida.</p>
          </div>

          {/* Drop zone */}
          {!rows.length && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Arrastra tu archivo Excel aquí</p>
              <p className="text-xs text-gray-400 mt-1">o haz click para seleccionar (.xlsx, .xls)</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* Resumen */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600 font-medium">{fileName}</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} con errores
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setRows([]); setFileName('') }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Partida</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Cod.</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Descripción</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">Und</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">P. Unit.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 ${row.valid ? 'hover:bg-gray-50' : 'bg-amber-50'}`}
                      >
                        <td className="px-3 py-1.5 text-gray-500 max-w-[120px] truncate">{row.categoryName}</td>
                        <td className="px-3 py-1.5 text-gray-400 font-mono">{row.code}</td>
                        <td className="px-3 py-1.5 text-gray-800 max-w-[200px] truncate">{row.description}</td>
                        <td className="px-3 py-1.5 text-center text-gray-500">{row.unit}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{row.quantity}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{formatRD(row.unit_price)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                          {row.valid ? formatRD(row.quantity * row.unit_price) : (
                            <span className="text-amber-600 text-[10px]">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && validCount > 0 && (
            <button
              onClick={handleConfirm}
              disabled={importing}
              className="px-4 py-2 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importando...' : `Importar ${validCount} subpartidas`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
