import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { qualityControlService } from '@/services/qualityControlService'
import { getQualityStats } from '@/components/features/quality/qualityUtils'
import type { QualityControl } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

type QualityFormData = Omit<QualityControl, 'id' | 'status'>

function useQualityRecords(projectId?: string) {
  const [records, setRecords] = useState<QualityControl[]>([])
  const [loading, setLoading] = useState(true)
  const { error } = useToast()

  const load = useCallback(async () => {
    if (!projectId) {
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const nextRecords = await qualityControlService.getByProject(projectId)
      setRecords(nextRecords)
    } catch (loadError) {
      error(`No se pudieron cargar ensayos: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error, projectId])

  useEffect(() => {
    void load()
  }, [load])

  return { records, loading, load }
}

function useQualityProject(projectId?: string) {
  const { projects, fetchProjects } = useProjectStore()

  useEffect(() => {
    if (projects.length) return
    void fetchProjects()
  }, [fetchProjects, projects.length])

  const projectName = useMemo(
    () => projects.find((project) => project.id === projectId)?.name ?? 'Proyecto',
    [projectId, projects],
  )

  return { projectName }
}

function useQualityModals() {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<QualityControl | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  return {
    showCreate,
    editing,
    deletingId,
    saving,
    setShowCreate,
    setEditing,
    setDeletingId,
    setSaving,
  }
}

type QualityActionsArgs = {
  projectId?: string
  editing: QualityControl | undefined
  deletingId: string | null
  records: QualityControl[]
  load: () => Promise<void>
  onError: (message: string) => void
  setSaving: (value: boolean) => void
  setEditing: (value: QualityControl | undefined) => void
  setShowCreate: (value: boolean) => void
  setDeletingId: (value: string | null) => void
}

function useQualityActions(args: QualityActionsArgs) {
  // Candado inmediato contra doble clic (evita duplicar el ensayo).
  const savingRef = useRef(false)
  const submitRecord = useCallback(
    async (data: QualityFormData) => {
      if (!args.projectId) return
      if (savingRef.current) return
      savingRef.current = true
      args.setSaving(true)
      try {
        if (args.editing) {
          // B4: if the comprobante path changed during editing, delete the old file
          const oldPath = args.editing.comprobante_url
          const newPath = data.comprobante_url
          await qualityControlService.update(args.editing.id, data)
          if (oldPath && oldPath !== newPath) {
            void qualityControlService.deleteComprobante(oldPath).catch(() => undefined)
          }
          args.setEditing(undefined)
        } else {
          await qualityControlService.create(data)
          args.setShowCreate(false)
        }
        await args.load()
      } catch (saveError) {
        args.onError(`No se pudo guardar ensayo: ${getErrorMessage(saveError)}`)
      } finally {
        savingRef.current = false
        args.setSaving(false)
      }
    },
    [args],
  )

  const confirmDelete = useCallback(async () => {
    if (!args.deletingId) return
    // B4: read the comprobante_url before deleting the row
    const recordToDelete = args.records.find((r) => r.id === args.deletingId)
    try {
      await qualityControlService.delete(args.deletingId)
      args.setDeletingId(null)
      if (recordToDelete?.comprobante_url) {
        void qualityControlService.deleteComprobante(recordToDelete.comprobante_url).catch(() => undefined)
      }
      await args.load()
    } catch (deleteError) {
      args.onError(`No se pudo eliminar ensayo: ${getErrorMessage(deleteError)}`)
    }
  }, [args])

  return { submitRecord, confirmDelete }
}

export function useQualityControlPage(projectId?: string) {
  const { error } = useToast()
  const quality = useQualityRecords(projectId)
  const project = useQualityProject(projectId)
  const modal = useQualityModals()
  const stats = useMemo(() => getQualityStats(quality.records), [quality.records])
  const actions = useQualityActions({
    projectId,
    editing: modal.editing,
    deletingId: modal.deletingId,
    records: quality.records,
    load: quality.load,
    onError: error,
    setSaving: modal.setSaving,
    setEditing: modal.setEditing,
    setShowCreate: modal.setShowCreate,
    setDeletingId: modal.setDeletingId,
  })

  return {
    projectName: project.projectName,
    records: quality.records,
    loading: quality.loading,
    stats,
    showCreate: modal.showCreate,
    editing: modal.editing,
    deletingId: modal.deletingId,
    saving: modal.saving,
    setShowCreate: modal.setShowCreate,
    setEditing: modal.setEditing,
    setDeletingId: modal.setDeletingId,
    submitRecord: actions.submitRecord,
    confirmDelete: actions.confirmDelete,
  }
}
