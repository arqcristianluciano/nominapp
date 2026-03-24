import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { cubicationService, type CubicationWithContractor } from '@/services/cubicationService'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { CubicacionForm } from '@/components/features/control/CubicacionForm'
import { formatRD } from '@/utils/currency'
import type { Contractor } from '@/types/database'

export default function CubicacionesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const [cubicaciones, setCubicaciones] = useState<CubicationWithContractor[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CubicationWithContractor | undefined>()
  const [saving, setSaving] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
    contractorService.getAll().then(setContractors).catch(() => {})
  }, [projects.length, fetchProjects])

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  async function load() {
    setLoading(true)
    try { setCubicaciones(await cubicationService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }

  type FormData = { contractor_id: string; specialty: string; original_budget: number; adjusted_budget: number; total_advanced: number }

  async function handleSubmit(data: FormData) {
    setSaving(true)
    try {
      if (editing) {
        await cubicationService.update(editing.id, data)
        setEditing(undefined)
      } else {
        await cubicationService.create({ ...data, project_id: projectId! })
        setShowForm(false)
      }
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta cubicación?')) return
    await cubicationService.delete(id)
    await load()
  }

  const totals = cubicaciones.reduce(
    (acc, c) => ({ original: acc.original + (c.original_budget || 0), adjusted: acc.adjusted + (c.adjusted_budget || 0), advanced: acc.advanced + c.total_advanced }),
    { original: 0, adjusted: 0, advanced: 0 }
  )

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/proyectos/${projectId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Cubicaciones</h1>
            <p className="text-sm text-app-muted mt-0.5">Contrato y avance por contratista</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total contratado</p>
          <p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.adjusted)}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total avanzado</p>
          <p className="text-xl font-semibold text-blue-700 mt-1">{formatRD(totals.advanced)}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total restante</p>
          <p className={`text-xl font-semibold mt-1 ${totals.adjusted - totals.advanced >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatRD(totals.adjusted - totals.advanced)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando cubicaciones...</div>
      ) : cubicaciones.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center">
          <Layers className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay cubicaciones registradas</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Agregar la primera</button>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Contratista</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Especialidad</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Contratado</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Avanzado</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Restante</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {cubicaciones.map((c) => (
                <tr key={c.id} className="hover:bg-app-hover">
                  <td className="px-3 py-3">
                    <p className="font-medium text-app-text text-xs">{c.contractor?.name || '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-app-muted text-xs hidden sm:table-cell">{c.specialty}</td>
                  <td className="px-3 py-3 text-app-muted text-xs text-right">{formatRD(c.adjusted_budget || 0)}</td>
                  <td className="px-3 py-3 text-blue-700 text-xs text-right hidden md:table-cell">{formatRD(c.total_advanced)}</td>
                  <td className={`px-3 py-3 text-xs font-semibold text-right hidden md:table-cell ${c.remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatRD(c.remaining)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-14 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.completion_percent > 90 ? 'bg-red-500' : c.completion_percent > 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${c.completion_percent}%` }} />
                      </div>
                      <span className="text-[10px] text-app-muted w-8">{c.completion_percent.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(c)} className="p-1 text-app-subtle hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Agregar cubicación">
        <CubicacionForm contractors={contractors} saving={saving} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar cubicación">
        {editing && (
          <CubicacionForm
            contractors={contractors}
            saving={saving}
            initial={{ id: editing.id, contractor_id: editing.contractor_id, specialty: editing.specialty, original_budget: editing.original_budget ?? 0, adjusted_budget: editing.adjusted_budget ?? 0, total_advanced: editing.total_advanced }}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(undefined)}
          />
        )}
      </Modal>
    </div>
  )
}
