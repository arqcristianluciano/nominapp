import { useCallback, useEffect, useState } from 'react'
import {
  bitacoraService,
  type BitacoraEntry,
  type BitacoraFormData,
  type PendingPhoto,
} from '@/services/bitacoraService'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'
import { useAuthStore } from '@/stores/authStore'
import { compressImageFile } from '@/utils/imageCompression'
import { buildBitacoraFormFromEntry, createBitacoraForm } from './bitacoraConfig'

function useBitacoraEntries(projectId?: string) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { error } = useToast()

  const reload = useCallback(async () => {
    if (!projectId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setEntries(await bitacoraService.getByProject(projectId))
    } catch (loadError) {
      error(`No se pudo cargar bitácora: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error, projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { entries, loading, reload }
}

function useBitacoraEditor(projectId: string | undefined, entries: BitacoraEntry[], reload: () => Promise<void>) {
  const { error } = useToast()
  const user = useAuthStore((s) => s.user)
  const createdBy = user?.displayName ?? ''

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BitacoraFormData>(createBitacoraForm(projectId ?? '', createdBy))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const openCreate = useCallback(() => {
    if (!projectId) return
    setShowForm(true)
    setEditId(null)
    // B5: always inject the real user name when opening a new form
    setForm(createBitacoraForm(projectId, createdBy))
  }, [createdBy, projectId])

  const startEdit = useCallback((entry: BitacoraEntry) => {
    setForm(buildBitacoraFormFromEntry(entry))
    setEditId(entry.id)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditId(null)
  }, [])

  /**
   * Guarda el registro de bitácora y luego sube las fotos pendientes.
   * Las fotos se suben después de crear/actualizar el registro porque
   * necesitamos el ID del registro para guardarlo en bitacora_photos.
   */
  const saveEntry = useCallback(
    async (pendingPhotos: PendingPhoto[]) => {
      if (!projectId || !form.work_summary.trim()) return
      setSaving(true)
      try {
        // B5: asegurar created_by con el usuario real en registros nuevos.
        const formToSave = editId ? form : { ...form, created_by: createdBy || form.created_by }
        let entryId: string
        if (editId) {
          await bitacoraService.update(editId, formToSave)
          entryId = editId
        } else {
          const created = await bitacoraService.create(formToSave)
          entryId = created.id
        }

        // Sube las fotos pendientes al bucket y registra cada una en bitacora_photos.
        // Las fotos se suben en serie para no sobrecargar la conexión.
        for (const pending of pendingPhotos) {
          try {
            const compressed = await compressImageFile(pending.file)
            const storagePath = await bitacoraService.uploadPhoto(projectId, compressed)
            await bitacoraService.addPhotoRecord(entryId, storagePath)
          } catch {
            // Si falla una foto, continúa con las demás (el registro ya está guardado).
          }
        }

        closeForm()
        setForm(createBitacoraForm(projectId, createdBy))
        await reload()
      } catch (saveError) {
        // B3: avisar al usuario en vez de tragar el error.
        error(`No se pudo guardar la entrada: ${getErrorMessage(saveError)}`)
      } finally {
        setSaving(false)
      }
    },
    [closeForm, createdBy, editId, error, form, projectId, reload],
  )

  /**
   * Elimina el registro de bitácora junto con todas sus fotos del bucket.
   * Pasos:
   *   1. Lee los paths de bitacora_photos (y el photo_url legacy) para saber
   *      qué archivos eliminar del bucket.
   *   2. Borra el registro de bitacora_entries (cascada borra bitacora_photos).
   *   3. Elimina los archivos del bucket (best-effort, no bloquea si falla).
   */
  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      // Recolecta todos los storage paths antes de borrar la fila.
      let storagePaths: string[] = []
      try {
        const photos = await bitacoraService.getPhotos(deleteId)
        storagePaths = photos.map((p) => p.storage_path)
      } catch {
        // Si falla la consulta, seguimos igual (no bloqueamos el borrado).
      }
      // B4: incluye el photo_url legacy por si no se migró a bitacora_photos.
      const legacy = entries.find((e) => e.id === deleteId)?.photo_url
      if (legacy && !storagePaths.includes(legacy)) storagePaths.push(legacy)

      // Borra el registro (bitacora_photos se borra en cascada).
      await bitacoraService.delete(deleteId)
      setDeleteId(null)

      // Limpia los archivos del bucket (best-effort).
      if (storagePaths.length > 0) {
        void bitacoraService.deletePhotoFiles(storagePaths).catch(() => undefined)
      }
      await reload()
    } catch (deleteError) {
      // B3: avisar al usuario si falla el borrado.
      error(`No se pudo eliminar la entrada: ${getErrorMessage(deleteError)}`)
    }
  }, [deleteId, entries, error, reload])

  const toggleExpand = useCallback((entryId: string) => {
    setExpandedId((current) => (current === entryId ? null : entryId))
  }, [])

  return {
    showForm,
    form,
    expandedId,
    deleteId,
    saving,
    editId,
    setForm,
    setDeleteId,
    openCreate,
    startEdit,
    closeForm,
    saveEntry,
    confirmDelete,
    toggleExpand,
  }
}

export function useBitacoraPage(projectId?: string) {
  const { entries, loading, reload } = useBitacoraEntries(projectId)
  const editor = useBitacoraEditor(projectId, entries, reload)
  return { entries, loading, ...editor }
}
