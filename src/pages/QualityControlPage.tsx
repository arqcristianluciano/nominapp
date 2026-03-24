import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, FlaskConical, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { qualityControlService } from '@/services/qualityControlService'
import { Modal } from '@/components/ui/Modal'
import { QualityControlForm } from '@/components/features/quality/QualityControlForm'
import type { QualityControl } from '@/types/database'

export default function QualityControlPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const [records, setRecords] = useState<QualityControl[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<QualityControl | undefined>()
  const [saving, setSaving] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  async function load() {
    setLoading(true)
    try {
      setRecords(await qualityControlService.getByProject(projectId!))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(data: Omit<QualityControl, 'id' | 'status'>) {
    setSaving(true)
    try {
      if (editing) {
        await qualityControlService.update(editing.id, data)
        setEditing(undefined)
      } else {
        await qualityControlService.create(data)
        setShowForm(false)
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este ensayo?')) return
    await qualityControlService.delete(id)
    await load()
  }

  const passed = records.filter((r) => r.status === 'passed').length
  const failed = records.filter((r) => r.status === 'failed').length
  const pending = records.filter((r) => !r.status).length

  function StatusBadge({ status }: { status: QualityControl['status'] }) {
    if (status === 'passed') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700"><CheckCircle2 className="w-3 h-3" />Aprobado</span>
    if (status === 'failed') return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700"><XCircle className="w-3 h-3" />Fallido</span>
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-app-chip text-app-muted"><Clock className="w-3 h-3" />Pendiente</span>
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/proyectos/${projectId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-muted mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Control de Calidad</h1>
            <p className="text-sm text-app-muted mt-0.5">Ensayos de resistencia del hormigón</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo ensayo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700">{passed}</p>
          <p className="text-xs text-green-600">Aprobados</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-700">{failed}</p>
          <p className="text-xs text-red-600">Fallidos</p>
        </div>
        <div className="bg-app-bg border border-app-border rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-app-subtle mx-auto mb-1" />
          <p className="text-2xl font-bold text-app-muted">{pending}</p>
          <p className="text-xs text-app-muted">Pendientes</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando ensayos...</div>
      ) : records.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center">
          <FlaskConical className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay ensayos registrados</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Registrar primer ensayo</button>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Elemento</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Colada</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Edad</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Esperada</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Real</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Proveedor</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase">Estado</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-app-hover">
                  <td className="px-3 py-2.5 font-medium text-app-text text-xs">{r.element}</td>
                  <td className="px-3 py-2.5 text-app-muted text-xs">{new Date(r.pour_date).toLocaleDateString('es-DO')}</td>
                  <td className="px-3 py-2.5 text-app-muted text-xs hidden sm:table-cell">{r.test_age || '—'}</td>
                  <td className="px-3 py-2.5 text-app-muted text-xs text-right">{r.expected_resistance ? `${r.expected_resistance} kg/cm²` : '—'}</td>
                  <td className={`px-3 py-2.5 text-xs font-semibold text-right ${r.status === 'failed' ? 'text-red-600' : r.status === 'passed' ? 'text-green-600' : 'text-app-subtle'}`}>
                    {r.actual_resistance ? `${r.actual_resistance} kg/cm²` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-app-muted text-xs hidden md:table-cell">{r.concrete_supplier || '—'}</td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)} className="p-1 text-app-subtle hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo ensayo de hormigón">
        <QualityControlForm projectId={projectId!} saving={saving} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar ensayo">
        {editing && <QualityControlForm projectId={projectId!} initial={editing} saving={saving} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} />}
      </Modal>
    </div>
  )
}
