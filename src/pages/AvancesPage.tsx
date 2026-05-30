import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import { partidaProgressService, type PartidaProgress } from '@/services/partidaProgressService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { useToast } from '@/components/ui/Toast'
import { AvancesFormSection, type AvancesFormState } from '@/components/features/avances/AvancesFormSection'
import { AvancesHistoryTable } from '@/components/features/avances/AvancesHistoryTable'

const EMPTY: AvancesFormState = {
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
  const [form, setForm] = useState<AvancesFormState>(EMPTY)
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

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold text-app-text break-words">
            Avances por partida {project?.name && `— ${project.name}`}
          </h1>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Registrar avance
        </button>
      </div>

      {showForm && (
        <AvancesFormSection
          form={form}
          setForm={setForm}
          categories={categories}
          items={items}
          saving={saving}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando…</div>
      ) : (
        <AvancesHistoryTable progresses={progresses} catById={catById} itemById={itemById} />
      )}
    </div>
  )
}
