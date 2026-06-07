import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { bitacoraService, type BitacoraFormData } from '@/services/bitacoraService'
import { WEATHER_OPTIONS } from './bitacoraConfig'
import { compressImageFile } from '@/utils/imageCompression'

interface Props {
  form: BitacoraFormData
  saving: boolean
  editMode: boolean
  onChange: (next: BitacoraFormData) => void
  onCancel: () => void
  onSave: () => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

export function BitacoraEntryForm({ form, saving, editMode, onChange, onCancel, onSave }: Props) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  // Cuando el form trae un photo_url (foto ya subida), pide una signed URL para mostrar la preview.
  useEffect(() => {
    let cancelled = false
    if (!form.photo_url) {
      setPreviewUrl(null)
      return
    }
    // Si ya tenemos preview local (subimos en esta sesión), no pedimos signed URL otra vez.
    if (localPreviewUrl) return
    void bitacoraService
      .getPhotoUrl(form.photo_url)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [form.photo_url, localPreviewUrl])

  // Limpia el object URL local cuando se desmonta o cambia.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  async function handlePhotoFile(file: File | null | undefined) {
    if (!file) return
    if (!form.project_id) {
      setUploadError('Selecciona un proyecto antes de subir fotos.')
      return
    }
    setUploadError(null)
    setUploading(true)
    // Preview local inmediata
    const localUrl = URL.createObjectURL(file)
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })
    try {
      const compressed = await compressImageFile(file)
      const path = await bitacoraService.uploadPhoto(form.project_id, compressed)
      onChange({ ...form, photo_url: path })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir la foto'
      setUploadError(message)
      // Limpia preview local si el upload falló.
      URL.revokeObjectURL(localUrl)
      setLocalPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  function clearPhoto() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    setLocalPreviewUrl(null)
    setPreviewUrl(null)
    setUploadError(null)
    onChange({ ...form, photo_url: null })
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const displayPreview = localPreviewUrl ?? previewUrl

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

      {/* Bloque de foto */}
      <div className="space-y-2">
        <label className="text-xs text-app-muted block">Foto del avance</label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading || saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-app-border rounded-lg text-app-text hover:bg-app-hover disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            Galería
          </button>
          {form.photo_url && (
            <button
              type="button"
              onClick={clearPhoto}
              disabled={uploading || saving}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Quitar
            </button>
          )}
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
        />

        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        {displayPreview && (
          <div className="mt-1">
            <img
              src={displayPreview}
              alt="Foto del avance"
              className="max-h-48 rounded-lg border border-app-border object-cover"
            />
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onCancel}
          disabled={saving || uploading}
          className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || uploading || !form.work_summary.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
