import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Layers, ChevronRight, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { contractService } from '@/services/cubicationService'
import type { ContractSummary } from '@/services/cubicationService'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { formatRD } from '@/utils/currency'
import type { Contractor } from '@/types/database'

export default function CubicacionesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects, fetchProjects } = useProjectStore()
  const [contracts, setContracts] = useState<ContractSummary[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  const [form, setForm] = useState({ contractor_id: '', retention_percent: '5', signed_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!projects.length) fetchProjects()
    contractorService.getAll().then(setContractors).catch(() => {})
  }, [projects.length, fetchProjects])

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  async function load() {
    setLoading(true)
    try { setContracts(await contractService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const created = await contractService.create({
        project_id: projectId!,
        contractor_id: form.contractor_id,
        retention_percent: Number(form.retention_percent),
        signed_date: form.signed_date || null,
        notes: form.notes || null,
      })
      setShowForm(false)
      setForm({ contractor_id: '', retention_percent: '5', signed_date: '', notes: '' })
      navigate(`/proyectos/${projectId}/cubicaciones/${created.id}`)
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear el contrato. Verifica que las tablas del módulo de cubicación existan en Supabase.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este contrato y todos sus datos?')) return
    await import('@/services/cubicationService').then((m) => m.contractService.delete(id))
    await load()
  }

  const totals = contracts.reduce(
    (acc, c) => ({ acordado: acc.acordado + c.acordado, acumulado: acc.acumulado + c.acumulado, pendiente: acc.pendiente + c.pendiente }),
    { acordado: 0, acumulado: 0, pendiente: 0 }
  )

  const inputCls = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-app-input-bg text-app-text focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link to={`/proyectos/${projectId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Cubicaciones</h1>
            <p className="text-sm text-app-muted mt-0.5">Contratos de ajuste por contratista</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo contrato
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total acordado</p>
          <p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.acordado)}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total acumulado</p>
          <p className="text-xl font-semibold text-blue-700 mt-1">{formatRD(totals.acumulado)}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted">Total pendiente</p>
          <p className={`text-xl font-semibold mt-1 ${totals.pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRD(totals.pendiente)}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-app-muted">Cargando contratos...</div>
      ) : contracts.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center">
          <Layers className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay contratos registrados</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Crear el primero</button>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Contratista</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Partidas</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Acordado</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Acumulado</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Pendiente</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Retención</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {contracts.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/proyectos/${projectId}/cubicaciones/${c.id}`)}
                  className="hover:bg-app-hover cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-app-text text-xs">{c.contractor?.name || '—'}</p>
                    <p className="text-[10px] text-app-muted">{c.contractor?.specialty}</p>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-xs text-app-muted bg-app-chip px-2 py-0.5 rounded-full">{c.partidas_count}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-app-text font-medium">{formatRD(c.acordado)}</td>
                  <td className="px-4 py-3 text-right text-xs text-blue-700 hidden md:table-cell">{formatRD(c.acumulado)}</td>
                  <td className={`px-4 py-3 text-right text-xs font-semibold hidden md:table-cell ${c.pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRD(c.pendiente)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-14 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.completion_percent > 90 ? 'bg-red-500' : c.completion_percent > 60 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${c.completion_percent}%` }} />
                      </div>
                      <span className="text-[10px] text-app-muted w-8">{c.completion_percent.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-app-muted hidden lg:table-cell">{formatRD(c.retenido)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={(e) => handleDelete(c.id, e)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      <ChevronRight className="w-4 h-4 text-app-subtle" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo contrato */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo contrato de ajuste">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={labelCls}>Contratista *</label>
            <select value={form.contractor_id} onChange={(e) => setForm({ ...form, contractor_id: e.target.value })} className={inputCls} required>
              <option value="">Seleccionar contratista...</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.specialty}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Retención (%)</label>
              <input type="number" step="0.5" min="0" max="20" value={form.retention_percent} onChange={(e) => setForm({ ...form, retention_percent: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha de firma</label>
              <input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notas</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Descripción del alcance..." className={inputCls} />
          </div>
          {formError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setFormError(null) }} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
