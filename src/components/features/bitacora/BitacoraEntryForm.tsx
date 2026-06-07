import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import {
  bitacoraService,
  validatePhotoFile,
  type BitacoraFormData,
  type PendingPhoto,
} from '@/services/bitacoraService'
import { WEATHER_OPTIONS } from './bitacoraConfig'

interface Props {
  form: BitacoraFormData
  saving: boolean
  editMode: boolean
  onChange: (next: BitacoraFormData) => void
  onCancel: () => void
  /** onSave recibe los archivos pendientes para que el caller los suba después de crear/actualizar el registro. */
  onSave: (pendingPhotos: PendingPhoto[]) => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: preview de una foto pendiente (no subida aún)
// ─────────────────────────────────────────────────────────────────────────────
function PendingPhotoCard({
  photo,
  onRemove,
  disabled,
}: {
  photo: PendingPhoto
  onRemove: () => void
  disabled: boolean
}) {
  return (
    <div className="relative group">
      <img
        src={photo.localUrl}
        alt="Vista previa"
        className="w-24 h-24 object-cover rounded-lg border border-app-border"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Quitar foto"
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: preview de una foto ya guardada (legacy photo_url)
// ─────────────────────────────────────────────────────────────────────────────
function SavedPhotoCard({
  storagePath,
  onRemove,
  disabled,
}: {
  storagePath: string
  onRemove: () => void
  disabled: boolean
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void bitacoraService
      .getPhotoUrl(storagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url)
      })
      .catch(() => {
        if (!cancelled) setSignedUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [storagePath])

  if (!signedUrl) {
    return (
      <div className="w-24 h-24 rounded-lg border border-app-border bg-app-bg flex items-center justify-center text-app-subtle">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative group">
      <img src={signedUrl} alt="Foto guardada" className="w-24 h-24 object-cover rounded-lg border border-app-border" />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Quitar foto guardada"
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario principal
// ─────────────────────────────────────────────────────────────────────────────
export function BitacoraEntryForm({ form, saving, editMode, onChange, onCancel, onSave }: Props) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  /** Fotos seleccionadas aún no subidas al servidor. */
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Limpia los object URLs al desmontar el formulario para liberar memoria.
  useEffect(() => {
    return () => {
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.localUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Agrega uno o varios archivos seleccionados a la cola de pendientes. */
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    const newPending: PendingPhoto[] = []
    for (const file of Array.from(files)) {
      try {
        validatePhotoFile(file)
        newPending.push({ localUrl: URL.createObjectURL(file), file })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Archivo no válido')
        // Continúa con los demás archivos.
      }
    }
    if (newPending.length > 0) {
      setPendingPhotos((prev) => [...prev, ...newPending])
    }
    // Limpia el input para que se pueda seleccionar el mismo archivo de nuevo.
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  /** Quita una foto pendiente (antes de guardar) y libera el object URL. */
  function removePending(index: number) {
    setPendingPhotos((prev) => {
      const item = prev[index]
      if (item) URL.revokeObjectURL(item.localUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  /** Quita la foto legacy (photo_url del form) del registro. */
  function clearLegacyPhoto() {
    onChange({ ...form, photo_url: null })
  }

  const busy = saving

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">{editMode ? 'Editar registro' : 'Nuevo registro'}</h3>

      {/* Fila superior: stack en mobile, 2 col en sm, 4 col en md */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-app-muted block mb-1">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Clima</label>
          <select
            value={form.weather}
            onChange={(e) => onChange({ ...form, weather: e.target.value })}
            className={inputCls}
          >
            {WEATHER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Temp. (°C)</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.temp_c ?? ''}
            onChange={(e) => onChange({ ...form, temp_c: e.target.value === '' ? null : +e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Personal en obra</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.workforce_count}
            onChange={(e) => onChange({ ...form, workforce_count: +e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-app-muted block mb-1">Resumen de actividades *</label>
        <textarea
          rows={3}
          value={form.work_summary}
          onChange={(e) => onChange({ ...form, work_summary: e.target.value })}
          placeholder="Describa las actividades realizadas hoy..."
          className={inputCls + ' resize-none'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-app-muted block mb-1">Equipos utilizados</label>
          <input
            value={form.equipment ?? ''}
            onChange={(e) => onChange({ ...form, equipment: e.target.value })}
            placeholder="Mixer, vibradora..."
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Visitas</label>
          <input
            value={form.visitors ?? ''}
            onChange={(e) => onChange({ ...form, visitors: e.target.value })}
            placeholder="Inspector, cliente..."
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Incidentes / Accidentes</label>
          <input
            value={form.incidents ?? ''}
            onChange={(e) => onChange({ ...form, incidents: e.target.value })}
            placeholder="Ninguno / descripción..."
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-app-muted block mb-1">Observaciones adicionales</label>
        <textarea
          rows={2}
          value={form.notes ?? ''}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* ── Bloque de fotos ── */}
      <div className="space-y-2">
        <label className="text-xs text-app-muted block">Fotos del avance</label>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-app-border rounded-lg text-app-text hover:bg-app-hover disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            Galería
          </button>
        </div>

        {/* Input cámara (una sola foto) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {/* Input galería (selección múltiple) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        {/* Grid de previews: foto legacy (photo_url) + fotos pendientes */}
        {(form.photo_url || pendingPhotos.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {/* Foto legacy: era la única foto antes de la migración 077 */}
            {form.photo_url && (
              <SavedPhotoCard storagePath={form.photo_url} onRemove={clearLegacyPhoto} disabled={busy} />
            )}
            {/* Fotos nuevas (pendientes de subir al guardar) */}
            {pendingPhotos.map((photo, index) => (
              <PendingPhotoCard
                key={photo.localUrl}
                photo={photo}
                onRemove={() => removePending(index)}
                disabled={busy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(pendingPhotos)}
          disabled={busy || !form.work_summary.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
