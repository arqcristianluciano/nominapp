import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { parseMercadoExcel, computeBudgetTotals } from '@/utils/parseMercadoExcel'
import { mercadoBudgetService, mercadoBudgetLineService } from '@/services/mercadoBudgetService'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/mercadoBudget'
import type { ParsedMercadoLine, MercadoCategory } from '@/types/mercadoBudget'
import { formatRD } from '@/utils/currency'

const CATEGORIES: MercadoCategory[] = ['AJUSTES', 'MANO_DE_OBRA', 'EQUIPOS', 'MATERIALES']

interface Props {
  projectId: string
  hasExisting: boolean
  onImported: () => void
}

export function MercadoExcelUpload({ projectId, hasExisting, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [lines, setLines] = useState<ParsedMercadoLine[]>([])
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<MercadoCategory | 'ALL'>('ALL')

  const handleFile = async (file: File) => {
    setError(null)
    setFileName(file.name)
    try {
      const parsed = await parseMercadoExcel(file)
      if (parsed.length === 0) {
        setError('No se detectaron líneas válidas. Verifique que el Excel tenga las categorías AJUSTES, EQUIPOS, MANO DE OBRA o MATERIALES como cabeceras de sección.')
        return
      }
      setLines(parsed)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      if (hasExisting) await mercadoBudgetService.deleteByProject(projectId)
      const totals = computeBudgetTotals(lines)
      const budget = await mercadoBudgetService.create({
        project_id: projectId,
        file_name: fileName,
        imported_at: new Date().toISOString(),
        ...totals,
      })
      await mercadoBudgetLineService.bulkInsert(budget.id, lines)
      onImported()
    } catch (e: any) {
      setError(e.message || 'Error al guardar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  const totals = computeBudgetTotals(lines)
  const filtered = activeCategory === 'ALL' ? lines : lines.filter((l) => l.category === activeCategory)
  const countByCategory = CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: lines.filter((l) => l.category === c).length }), {} as Record<MercadoCategory, number>)

  if (lines.length === 0) {
    return (
      <div className="space-y-4">
        {hasExisting && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            Reemplazará el presupuesto actual. Los contratos creados <strong>no se eliminarán</strong>, pero perderán el vínculo con las líneas.
          </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-medium">Formato esperado del Excel de Mercado:</p>
          <p>Filas de cabecera con el nombre de la categoría: <strong>AJUSTES · EQUIPOS · MANO DE OBRA · MATERIALES</strong></p>
          <p>Columnas bajo cada categoría: Código · Descripción · Unidad · Cantidad · Precio Unitario</p>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-app-border rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors"
        >
          <FileSpreadsheet className="w-8 h-8 text-app-subtle mx-auto mb-3" />
          <p className="text-sm text-app-muted">Arrastra el Excel del presupuesto aquí</p>
          <p className="text-xs text-app-subtle mt-1">o haz click para seleccionar (.xlsx, .xls)</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen por categoría */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="bg-app-surface border border-app-border rounded-lg p-3 text-xs">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${CATEGORY_COLORS[cat]}`}>
              {CATEGORY_LABELS[cat]}
            </span>
            <p className="font-semibold text-app-text">{formatRD(totals[`total_${cat.toLowerCase().replace('_de_', '_')}` as keyof typeof totals] ?? 0)}</p>
            <p className="text-app-muted">{countByCategory[cat]} líneas</p>
          </div>
        ))}
      </div>

      {/* Filtro + tabla preview */}
      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-app-border bg-app-bg">
          <div className="flex gap-1">
            {(['ALL', ...CATEGORIES] as const).map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'}`}>
                {cat === 'ALL' ? `Todas (${lines.length})` : `${CATEGORY_LABELS[cat]} (${countByCategory[cat]})`}
              </button>
            ))}
          </div>
          <button onClick={() => { setLines([]); setFileName('') }} className="text-xs text-app-subtle hover:text-app-muted flex items-center gap-1">
            <Upload className="w-3 h-3" /> Cambiar
          </button>
        </div>
        <div className="overflow-y-auto max-h-72">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-app-bg">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-app-muted">Categoría</th>
                <th className="px-3 py-2 text-left font-medium text-app-muted">Cód.</th>
                <th className="px-3 py-2 text-left font-medium text-app-muted">Descripción</th>
                <th className="px-3 py-2 text-center font-medium text-app-muted">Und</th>
                <th className="px-3 py-2 text-right font-medium text-app-muted">Cant.</th>
                <th className="px-3 py-2 text-right font-medium text-app-muted">P. Unit.</th>
                <th className="px-3 py-2 text-right font-medium text-app-muted">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((l, i) => (
                <tr key={i} className="hover:bg-app-hover">
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_COLORS[l.category]}`}>
                      {CATEGORY_LABELS[l.category]}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-app-subtle font-mono">{l.code || '—'}</td>
                  <td className="px-3 py-1.5 text-app-text max-w-[220px] truncate">{l.description}</td>
                  <td className="px-3 py-1.5 text-center text-app-muted">{l.unit}</td>
                  <td className="px-3 py-1.5 text-right text-app-muted">{l.budgeted_quantity}</td>
                  <td className="px-3 py-1.5 text-right text-app-muted">{formatRD(l.budgeted_unit_price)}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-app-text">{formatRD(l.budgeted_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-app-muted">
          <CheckCircle className="inline w-3.5 h-3.5 text-green-600 mr-1" />
          {lines.length} líneas listas para importar de <span className="font-medium">{fileName}</span>
        </p>
        <button onClick={handleConfirm} disabled={saving}
          className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Confirmar importación'}
        </button>
      </div>
    </div>
  )
}
