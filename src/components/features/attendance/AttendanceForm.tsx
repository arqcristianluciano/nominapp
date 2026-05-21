import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, MapPin, X } from 'lucide-react'
import type { AttendanceFormData } from '@/services/attendanceService'
import { attendanceService } from '@/services/attendanceService'
import type { Contractor } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

interface Props {
  form: Omit<AttendanceFormData, 'project_id'>
  contractors: Contractor[]
  saving: boolean
  projectId?: string
  onChange: (next: Omit<AttendanceFormData, 'project_id'>) => void
  onCancel: () => void
  onSave: () => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

export function AttendanceForm({
  form,
  contractors,
  saving,
  projectId,
  onChange,
  onCancel,
  onSave,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const { success, error: toastError } = useToast()

  // Resuelve signed URL para preview cuando ya hay foto guardada como path.
  useEffect(() => {
    let cancelled = false
    if (!form.photo_url) {
      setPreviewUrl(null)
      return
    }
    if (localPreviewUrl) return
    void attendanceService
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

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  // Attempt to capture geolocation as soon as the form opens (best-effort).
  useEffect(() => {
    if (form.latitude != null && form.longitude != null) return
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onChange({
          ...form,
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        })
      },
      () => {
        // Silently ignore: user may have denied permission. They can retry manually.
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRetryLocation() {
    if (!('geolocation' in navigator)) {
      toastError('El navegador no soporta geolocalización')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onChange({
          ...form,
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        })
        success('Ubicación capturada')
      },
      (err) => {
        setLocating(false)
        toastError(`No se pudo obtener ubicación: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  async function handlePhotoFile(file: File | null | undefined) {
    if (!file) return
    if (!projectId) {
      toastError('No hay proyecto seleccionado')
      return
    }
    setUploadingPhoto(true)
    const localUrl = URL.createObjectURL(file)
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })
    try {
      const path = await attendanceService.uploadPhoto(projectId, file)
      onChange({ ...form, photo_url: path })
      success('Foto cargada')
    } catch (uploadError) {
      toastError(`No se pudo cargar la foto: ${getErrorMessage(uploadError)}`)
      URL.revokeObjectURL(localUrl)
      setLocalPreviewUrl(null)
    } finally {
      setUploadingPhoto(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  function handleRemovePhoto() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    setLocalPreviewUrl(null)
    setPreviewUrl(null)
    onChange({ ...form, photo_url: null })
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const hasLocation = form.latitude != null && form.longitude != null
  const displayPreview = localPreviewUrl ?? previewUrl

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Nuevo registro de asistencia</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <label className="text-xs text-app-muted block mb-1">Contratista *</label>
          <select
            value={form.contractor_id}
            onChange={(e) => onChange({ ...form, contractor_id: e.target.value })}
            className={inputCls}
          >
            <option value="">Seleccionar...</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Trabajadores</label>
          <input
            type="number"
            min={1}
            value={form.workers_count}
            onChange={(e) => onChange({ ...form, workers_count: +e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Horas trabajadas</label>
          <input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={form.hours_worked}
            onChange={(e) => onChange({ ...form, hours_worked: +e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-app-muted block mb-1">Actividad *</label>
          <input
            value={form.activity}
            onChange={(e) => onChange({ ...form, activity: e.target.value })}
            placeholder="Ej: Vaciado columnas nivel 2"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Notas</label>
          <input
            value={form.notes ?? ''}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Observaciones opcionales"
            className={inputCls}
          />
        </div>
      </div>

      {/* Foto del trabajador */}
      <div className="space-y-2">
        <label className="text-xs text-app-muted block">Foto del trabajador</label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadingPhoto || saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadingPhoto || saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-app-border rounded-lg text-app-text hover:bg-app-hover disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            Galería
          </button>
          {form.photo_url && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={uploadingPhoto || saving}
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

        {displayPreview && (
          <div className="mt-1">
            <img
              src={displayPreview}
              alt="Foto del trabajador"
              className="max-h-48 rounded-lg border border-app-border object-cover"
            />
          </div>
        )}
      </div>

      {/* Ubicación */}
      <div className="space-y-2">
        <label className="text-xs text-app-muted block">Ubicación</label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px] px-3 py-2 text-xs border border-app-border rounded-lg bg-app-bg text-app-muted">
            {locating ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Capturando ubicación...
              </span>
            ) : hasLocation ? (
              <span className="text-app-text">
                {form.latitude?.toFixed(5)}, {form.longitude?.toFixed(5)}
              </span>
            ) : (
              <span>Sin ubicación</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRetryLocation}
            disabled={locating || saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-text disabled:opacity-50"
            title={hasLocation ? 'Reintentar' : 'Capturar ubicación'}
          >
            <MapPin className="w-4 h-4" />
            {hasLocation ? 'Actualizar' : 'Capturar'}
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.contractor_id || !form.activity.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
