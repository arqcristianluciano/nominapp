import { useCallback, useEffect, useState } from 'react'
import { History, Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { budgetVersionService, type BudgetVersion } from '@/services/budgetVersionService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'
import { formatRD } from '@/utils/currency'
import { formatDateDMY } from '@/utils/dateLocal'

interface Props {
  open: boolean
  projectId: string
  onClose: () => void
}

/** Suma el total (cantidad × precio) de las subpartidas de una versión guardada. */
function versionTotal(v: BudgetVersion): number {
  return (v.snapshot?.items ?? []).reduce((sum, it) => sum + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0), 0)
}

export function BudgetVersionsModal({ open, projectId, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const { success, error: toastError } = useToast()
  const [versions, setVersions] = useState<BudgetVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [motivo, setMotivo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVersions(await budgetVersionService.listByProject(projectId))
    } catch (e) {
      toastError(`No se pudo cargar el historial: ${getErrorMessage(e)}`)
    } finally {
      setLoading(false)
    }
  }, [projectId, toastError])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const handleSave = async () => {
    const reason = motivo.trim() || 'Copia manual del presupuesto'
    setSaving(true)
    try {
      await budgetVersionService.snapshot(projectId, reason, user?.displayName)
      setMotivo('')
      success('Versión del presupuesto guardada.')
      await load()
    } catch (e) {
      toastError(`No se pudo guardar la versión: ${getErrorMessage(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Historial del presupuesto" width="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-app-muted">
          Cada versión es una copia de cómo estaba el presupuesto en un momento. Se guarda una automáticamente antes de
          importar de Excel sobre un presupuesto que ya tiene datos. También puedes guardar una copia ahora:
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional): p. ej. antes de ajustar precios"
            className="flex-1 border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar versión'}
          </button>
        </div>

        <div className="border-t border-app-border pt-3">
          {loading ? (
            <p className="text-sm text-app-muted py-6 text-center">Cargando historial…</p>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-sm text-app-subtle">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Todavía no hay versiones guardadas.
            </div>
          ) : (
            <ul className="divide-y divide-app-border max-h-80 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-app-text">
                      Versión {v.version} · {formatDateDMY(v.created_at)}
                    </p>
                    <p className="text-xs text-app-muted mt-0.5">{v.motivo}</p>
                    <p className="text-xs text-app-subtle mt-0.5">
                      {(v.snapshot?.categories ?? []).length} capítulos · {(v.snapshot?.items ?? []).length} subpartidas
                      {v.actor ? ` · ${v.actor}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-app-text whitespace-nowrap">
                    {formatRD(versionTotal(v))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
