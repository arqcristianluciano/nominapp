import { useCallback, useEffect, useState } from 'react'
import {
  bitacoraService,
  type BitacoraEntry,
  type BitacoraFormData,
  type PendingPhoto,
} from '@/services/bitacoraService'
import { buildBitacoraFormFromEntry, createBitacoraForm } from './bitacoraConfig'

function useBitacoraEntries(projectId?: string) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!projectId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setEntries(await bitacoraService.getByProject(projectId))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { entries, loading, reload }
}

function useBitacoraEditor(projectId: string | undefined, reload: () => Promise<void>) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BitacoraFormData>(createBitacoraForm(projectId ?? ''))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const openCreate = useCallback(() => {
    if (!projectId) return
    setShowForm(true)
    setEditId(null)
    setForm(createBitacoraForm(projectId))
  }, [projectId])

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
        let entryId: string
        if (editId) {
          await bitacoraService.update(editId, form)
          entryId = editId
        } else {
          const created = await bitacoraService.create(form)
          entryId = created.id
        }

        // Sube las fotos pendientes al bucket y registra cada una en bitacora_photos.
        // Las fotos se suben en serie para no sobrecargar la conexión.
        for (const pending of pendingPhotos) {
          try {
            const storagePath = await bitacoraService.uploadPhoto(projectId, pending.file)
            await bitacoraService.addPhotoRecord(entryId, storagePath)
          } catch {
            // Si falla una foto, continúa con las demás (el registro ya está guardado).
          }
        }

        closeForm()
        setForm(createBitacoraForm(projectId))
        await reload()
      } finally {
        setSaving(false)
      }
    },
    [closeForm, editId, form, projectId, reload],
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

    // Recolecta todos los storage paths antes de borrar la fila.
    let storagePaths: string[] = []
    try {
      const photos = await bitacoraService.getPhotos(deleteId)
      storagePaths = photos.map((p) => p.storage_path)
    } catch {
      // Si falla la consulta, seguimos igual (no bloqueamos el borrado).
    }

    // Borra el registro (la tabla bitacora_photos se borra en cascada).
    await bitacoraService.delete(deleteId)
    setDeleteId(null)

    // Limpia los archivos del bucket (best-effort).
    if (storagePaths.length > 0) {
      void bitacoraService.deletePhotoFiles(storagePaths).catch(() => undefined)
    }

    await reload()
  }, [deleteId, reload])

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
  const editor = useBitacoraEditor(projectId, reload)
  return { entries, loading, ...editor }
}
