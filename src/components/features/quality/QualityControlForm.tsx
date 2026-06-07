import { useRef, useState } from 'react'
import { Camera, FileText, Paperclip, X } from 'lucide-react'
import type { QualityControl } from '@/types/database'
import { parseDecimalInput } from '@/utils/decimalInput'
import { qualityControlService } from '@/services/qualityControlService'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

type FormData = Omit<QualityControl, 'id' | 'status'>

interface Props {
  initial?: QualityControl
  projectId: string
  saving: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

const TEST_AGES = ['7 días', '14 días', '21 días', '28 días']

export function QualityControlForm({ initial, projectId, saving, onSubmit, onCancel }: Props) {
  const [element, setElement] = useState(initial?.element || '')
  const [pourDate, setPourDate] = useState(initial?.pour_date || '')
  const [testDate, setTestDate] = useState(initial?.test_date || '')
  const [testAge, setTestAge] = useState(initial?.test_age || '28 días')
  const [expectedRes, setExpectedRes] = useState(initial?.expected_resistance?.toString() || '')
  const [actualRes, setActualRes] = useState(initial?.actual_resistance?.toString() || '')
  const [supplier, setSupplier] = useState(initial?.concrete_supplier || '')
  const [laboratory, setLaboratory] = useState(initial?.laboratory || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(initial?.comprobante_url || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track the path of any file uploaded during this session so we can clean it up.
  const sessionUploadedPath = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { error: toastError } = useToast()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const path = await qualityControlService.uploadComprobante(projectId, file)
      setComprobanteUrl(path)
      sessionUploadedPath.current = path
    } catch (uploadError) {
      toastError(`No se pudo subir el comprobante: ${getErrorMessage(uploadError)}`)
    } finally {
      setUploading(false)
    }
  }

  async function viewComprobante() {
    if (!comprobanteUrl) return
    try {
      const url = await qualityControlService.getComprobanteUrl(comprobanteUrl)
      const tab = window.open(url, '_blank', 'noopener,noreferrer')
      if (!tab) toastError('El navegador bloqueó la ventana. Permite ventanas emergentes e intenta de nuevo.')
    } catch {
      toastError('No se pudo abrir el comprobante')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Resistencia esperada (requerida): no puede quedar vacía y debe ser número válido.
    const expectedTrim = expectedRes.trim()
    if (!expectedTrim) {
      setError('La resistencia esperada es requerida')
      return
    }
    const expectedNum = parseDecimalInput(expectedTrim)
    if (expectedNum === null) {
      setError('Resistencia esperada inválida')
      return
    }

    // Resistencia real (opcional): si tiene contenido, debe ser número válido.
    const actualTrim = actualRes.trim()
    let actualNum: number | null = null
    if (actualTrim) {
      const parsed = parseDecimalInput(actualTrim)
      if (parsed === null) {
        setError('Resistencia real inválida')
        return
      }
      actualNum = parsed
    }

    onSubmit({
      project_id: projectId,
      element: element.toUpperCase(),
      pour_date: pourDate,
      test_date: testDate || null,
      test_age: testAge || null,
      expected_resistance: expectedNum,
      actual_resistance: actualNum,
      concrete_supplier: supplier || null,
      laboratory: laboratory || null,
      notes: notes || null,
      comprobante_url: comprobanteUrl,
    })
  }

  const inputClass =
    'w-full px-3 py-2 min-h-[44px] border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Elemento *</label>
        <input
          type="text"
          value={element}
          onChange={(e) => setElement(e.target.value)}
          placeholder="Ej: COLUMNA C-1 EJE A"
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fecha de colada *</label>
          <input
            type="date"
            value={pourDate}
            onChange={(e) => setPourDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Resistencia esperada (kg/cm²) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={expectedRes}
            onChange={(e) => setExpectedRes(e.target.value)}
            placeholder="210"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Edad de ensayo</label>
          <select value={testAge} onChange={(e) => setTestAge(e.target.value)} className={inputClass}>
            {TEST_AGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha de ensayo</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Resistencia real (kg/cm²)</label>
          <input
            type="text"
            inputMode="decimal"
            value={actualRes}
            onChange={(e) => setActualRes(e.target.value)}
            placeholder="—"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Proveedor de hormigón</label>
          <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Laboratorio</label>
          <input
            type="text"
            value={laboratory}
            onChange={(e) => setLaboratory(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Comprobante (foto o PDF del resultado)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        {comprobanteUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-app-border px-3 py-2">
            <button
              type="button"
              onClick={viewComprobante}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline min-h-[44px]"
            >
              <FileText className="w-4 h-4" /> Ver comprobante
            </button>
            <button
              type="button"
              onClick={() => {
                // B4: if the file was uploaded this session (not from initial), delete it from storage
                const pathToRemove = comprobanteUrl
                if (pathToRemove && pathToRemove === sessionUploadedPath.current) {
                  void qualityControlService.deleteComprobante(pathToRemove).catch(() => undefined)
                  sessionUploadedPath.current = null
                }
                setComprobanteUrl(null)
              }}
              aria-label="Quitar comprobante"
              className="ml-auto p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-app-subtle hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm border border-app-border rounded-lg hover:bg-app-hover disabled:opacity-50 w-full sm:w-auto"
            >
              <Camera className="w-4 h-4" /> Tomar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] text-sm border border-app-border rounded-lg hover:bg-app-hover disabled:opacity-50 w-full sm:w-auto"
            >
              <Paperclip className="w-4 h-4" /> Elegir archivo
            </button>
            {uploading && <span className="text-xs text-app-muted self-center">Subiendo...</span>}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 min-h-[44px] text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover w-full sm:w-auto"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 min-h-[44px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Registrar ensayo'}
        </button>
      </div>
    </form>
  )
}
