import { useCallback, useEffect, useState } from 'react'
import { bitacoraService, type BitacoraEntry, type BitacoraFormData } from '@/services/bitacoraService'
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

  const saveEntry = useCallback(async () => {
    if (!projectId || !form.work_summary.trim()) return
    setSaving(true)
    try {
      if (editId) await bitacoraService.update(editId, form)
      else await bitacoraService.create(form)
      closeForm()
      setForm(createBitacoraForm(projectId))
      await reload()
    } finally {
      setSaving(false)
    }
  }, [closeForm, editId, form, projectId, reload])

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    await bitacoraService.delete(deleteId)
    setDeleteId(null)
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
