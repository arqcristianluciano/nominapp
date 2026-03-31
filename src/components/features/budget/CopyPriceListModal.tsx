import { useState } from 'react'
import { Copy, X } from 'lucide-react'
import type { Project, PriceListItem } from '@/types/database'

interface Props {
  sourceProjectName: string
  projects: Project[]
  currentProjectId: string
  itemCount: number
  onConfirm: (targetProjectId: string) => Promise<void>
  onClose: () => void
}

export default function CopyPriceListModal({
  sourceProjectName,
  projects,
  currentProjectId,
  itemCount,
  onConfirm,
  onClose,
}: Props) {
  const targets = projects.filter((p) => p.id !== currentProjectId)
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleConfirm = async () => {
    if (!targetId) return
    setLoading(true)
    try {
      await onConfirm(targetId)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const targetName = targets.find((p) => p.id === targetId)?.name ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-app-surface rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-app-text">Replicar lista de precios</span>
          </div>
          <button onClick={onClose} className="p-1 text-app-subtle hover:text-app-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-2xl">✓</div>
              <p className="text-sm font-medium text-green-600">
                {itemCount} ítems copiados a <strong>{targetName}</strong>
              </p>
              <p className="text-xs text-app-subtle">
                La lista de precios ya está disponible en el proyecto destino.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-app-muted">
                Se copiarán <strong className="text-app-text">{itemCount} ítems</strong> de{' '}
                <strong className="text-app-text">{sourceProjectName}</strong> al proyecto seleccionado.
                Los ítems existentes en destino no se eliminan.
              </p>

              {targets.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  No hay otros proyectos disponibles.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-app-muted">Proyecto destino</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-app-surface"
                  >
                    {targets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-app-muted hover:bg-app-hover rounded-lg"
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
          {!done && targets.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={loading || !targetId}
              className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 flex items-center gap-1.5"
            >
              {loading ? 'Copiando…' : (
                <><Copy className="w-3 h-3" /> Replicar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
