import { useCallback, useEffect, useState } from 'react'
import { bitacoraService, type BitacoraEntry, type BitacoraFormData } from '@/services/bitacoraService'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'
import { useAuthStore } from '@/stores/authStore'
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

  const saveEntry = useCallback(async () => {
    if (!projectId || !form.work_summary.trim()) return
    setSaving(true)
    try {
      // B5: ensure created_by is set to the current user on new entries
      const formToSave = editId ? form : { ...form, created_by: createdBy || form.created_by }
      if (editId) await bitacoraService.update(editId, formToSave)
      else await bitacoraService.create(formToSave)
      closeForm()
      setForm(createBitacoraForm(projectId, createdBy))
      await reload()
    } catch (saveError) {
      // B3: catch and toast errors instead of swallowing them
      error(`No se pudo guardar la entrada: ${getErrorMessage(saveError)}`)
    } finally {
      setSaving(false)
    }
  }, [closeForm, createdBy, editId, error, form, projectId, reload])

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    // B4: look up the photo_url before deleting the row
    const entryToDelete = entries.find((e) => e.id === deleteId)
    try {
      await bitacoraService.delete(deleteId)
      setDeleteId(null)
      if (entryToDelete?.photo_url) {
        void bitacoraService.deletePhoto(entryToDelete.photo_url).catch(() => undefined)
      }
      await reload()
    } catch (deleteError) {
      // B3: catch and toast errors on delete
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
