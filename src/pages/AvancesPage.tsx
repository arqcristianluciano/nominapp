import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import {
  partidaProgressService,
  type PartidaProgress,
} from '@/services/partidaProgressService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { useToast } from '@/components/ui/Toast'

interface FormState {
  budget_category_id: string
  budget_item_id: string
  cut_date: string
  executed_quantity: string
  executed_percent: string
  notes: string
}

const EMPTY: FormState = {
  budget_category_id: '',
  budget_item_id: '',
  cut_date: new Date().toISOString().split('T')[0],
  executed_quantity: '',
  executed_percent: '',
  notes: '',
}

export default function AvancesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const user = useAuthStore((s) => s.user)

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [progresses, setProgresses] = useState<PartidaProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [cats, progs] = await Promise.all([
        budgetCategoryService.getByProject(projectId),
        partidaProgressService.listByProject(projectId),
      ])
      setCategories(cats)
      setProgresses(progs)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!form.budget_category_id) {
      setItems([])
      return
    }
    let cancelled = false
    budgetItemService
      .getByCategoryId(form.budget_category_id)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [form.budget_category_id])

  async function handleSave() {
    if (!projectId) return
    if (!form.budget_category_id && !form.budget_item_id) return
    if (!form.executed_quantity && !form.executed_percent) return
    setSaving(true)
    try {
      await partidaProgressService.addProgress({
        project_id: projectId,
        budget_category_id: form.budget_category_id || null,
        budget_item_id: form.budget_item_id || null,
        cut_date: form.cut_date,
        executed_quantity: form.executed_quantity ? parseFloat(form.executed_quantity) : null,
        executed_percent: form.executed_percent ? parseFloat(form.executed_percent) : null,
        notes: form.notes.trim() || null,
        responsible: user?.displayName ?? null,
      })
      setForm(EMPTY)
      setShowForm(false)
      success('Avance registrado')
      await load()
    } catch (e) {
      error((e as Error).message ?? 'No se pudo registrar el avance')
    } finally {
      setSaving(false)
    }
  }

  const catById = new Map(categories.map((c) => [c.id, c]))
  const itemById = new Map(items.map((i) => [i.id, i]))
  const input =
    'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">
            Avances por partida {project?.name && `— ${project.name}`}
          </h1>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Registrar avance
        </button>
      </div>

      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Capítulo *</label>
              <select
                value={form.budget_category_id}
                onChange={(e) =>
                  setForm({ ...form, budget_category_id: e.target.value, budget_item_id: '' })
                }
                className={input}
              >
                <option value="">Seleccionar…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Partida (opcional)</label>
              <select
                value={form.budget_item_id}
                onChange={(e) => setForm({ ...form, budget_item_id: e.target.value })}
                disabled={!form.budget_category_id}
                className={input}
              >
                <option value="">— Avance a nivel de capítulo —</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.code ? `[${it.code}] ` : ''}
                    {it.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Fecha de corte *</label>
              <input
                type="date"
                value={form.cut_date}
                onChange={(e) => setForm({ ...form, cut_date: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Cantidad ejecutada</label>
              <input
                type="number"
                step="0.01"
                value={form.executed_quantity}
                onChange={(e) =>
                  setForm({ ...form, executed_quantity: e.target.value, executed_percent: '' })
                }
                placeholder="ej: 25"
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">o % ejecutado</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.executed_percent}
                onChange={(e) =>
                  setForm({ ...form, executed_percent: e.target.value, executed_quantity: '' })
                }
                placeholder="ej: 30"
                className={input}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="text-xs text-app-muted block mb-1">Observaciones</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Vaciado columnas eje 4..."
                className={input}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                (!form.budget_category_id && !form.budget_item_id) ||
                (!form.executed_quantity && !form.executed_percent)
              }
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando…</div>
      ) : progresses.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <p className="text-base font-semibold text-app-text mb-1">Sin avances registrados</p>
          <p className="text-sm text-app-muted">
            Captura avances por partida para alimentar la cubicación mensual.
          </p>
        </div>
      ) : (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-app-chip text-app-muted text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Capítulo</th>
                <th className="px-3 py-2 text-left">Partida</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">%</th>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-left">Notas</th>
              </tr>
            </thead>
            <tbody>
              {progresses.map((p) => {
                const cat = p.budget_category_id ? catById.get(p.budget_category_id) : null
                const it = p.budget_item_id ? itemById.get(p.budget_item_id) : null
                return (
                  <tr key={p.id} className="border-t border-app-border">
                    <td className="px-3 py-2 font-mono text-xs">{p.cut_date}</td>
                    <td className="px-3 py-2">
                      {cat ? (
                        <>
                          {cat.code} {cat.name}
                        </>
                      ) : (
                        <span className="text-app-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {it ? (
                        <>
                          {it.code ? `[${it.code}] ` : ''}
                          {it.description}
                        </>
                      ) : (
                        <span className="text-app-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{p.executed_quantity ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{p.executed_percent ?? '—'}</td>
                    <td className="px-3 py-2 text-app-muted">{p.responsible ?? '—'}</td>
                    <td className="px-3 py-2 text-app-muted">{p.notes ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
