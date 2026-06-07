import { useEffect, useMemo, useState } from 'react'
import type { Project, BudgetCategory, BudgetItem } from '@/types/database'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import { requisitionService } from '@/services/requisitionService'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import type { ResourceType } from '@/types/purchaseOrder'
import type { RequisitionItemInput } from '@/services/requisitionService'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { parseDecimalInput } from '@/utils/decimalInput'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Payload {
  project_id: string
  description: string
  requested_by: string
  required_date?: string
  notes?: string
  budget_category_id?: string | null
  budget_item_id?: string | null
  quantity_requested?: number | null
  unit?: string | null
  resource_type?: ResourceType | null
  items?: RequisitionItemInput[]
}

// Línea editable en el formulario (en memoria, antes de guardar).
interface ItemDraft {
  description: string
  categoryId: string
  itemId: string
  resourceType: ResourceType
  quantity: string
  unit: string
  availability: { planned: number; available: number } | null
  categories: BudgetCategory[]
  items: BudgetItem[]
}

interface Props {
  projects: Project[]
  onSubmit: (payload: Payload) => Promise<void>
  onCancel: () => void
  saving: boolean
  // Valores iniciales para modo edición.
  initialValues?: Partial<{
    project_id: string
    description: string
    requested_by: string
    required_date: string
    notes: string
    items: RequisitionItemInput[]
  }>
  submitLabel?: string
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Mano de obra' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'other', label: 'Otro' },
]

const inputClass =
  'w-full border border-app-border rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

// ── Componente de una línea de material ──────────────────────────────────────

interface ItemRowProps {
  draft: ItemDraft
  index: number
  projectId: string
  total: number
  onChange: (idx: number, patch: Partial<ItemDraft>) => void
  onRemove: (idx: number) => void
}

function ItemRow({ draft, index, projectId, total, onChange, onRemove }: ItemRowProps) {
  const qtyNum = parseDecimalInput(draft.quantity) ?? 0
  const exceedsPlan = draft.availability ? qtyNum > draft.availability.available : false

  // Cargar capítulos al cambiar el proyecto
  useEffect(() => {
    if (!projectId) {
      onChange(index, { categories: [], categoryId: '', items: [], itemId: '', availability: null })
      return
    }
    let cancelled = false
    budgetCategoryService
      .getByProject(projectId)
      .then((cats) => {
        if (!cancelled) onChange(index, { categories: cats })
      })
      .catch(() => {
        if (!cancelled) onChange(index, { categories: [] })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Cargar partidas al cambiar capítulo
  useEffect(() => {
    if (!draft.categoryId) {
      onChange(index, { items: [], itemId: '', availability: null })
      return
    }
    let cancelled = false
    budgetItemService
      .getByCategoryId(draft.categoryId)
      .then((its) => {
        if (!cancelled) onChange(index, { items: its })
      })
      .catch(() => {
        if (!cancelled) onChange(index, { items: [] })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.categoryId])

  // Calcular disponibilidad al cambiar partida
  useEffect(() => {
    if (!draft.itemId) {
      onChange(index, { availability: null })
      return
    }
    let cancelled = false
    requisitionService
      .getAvailabilityForBudgetItem(draft.itemId)
      .then((a) => {
        if (cancelled) return
        const item = draft.items.find((i) => i.id === draft.itemId)
        onChange(index, {
          availability: { planned: a.planned_quantity, available: a.available_quantity },
          unit: item?.unit ?? draft.unit,
        })
      })
      .catch(() => {
        if (!cancelled) onChange(index, { availability: null })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.itemId])

  const cell = 'border border-app-border rounded-lg px-2 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-app-bg rounded-lg border border-app-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-app-muted">Línea {index + 1}</span>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            title="Eliminar línea"
            className="inline-flex items-center justify-center w-8 h-8 rounded text-app-subtle hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Descripción *</label>
        <input
          value={draft.description}
          onChange={(e) => onChange(index, { description: e.target.value })}
          required
          placeholder="Ej: 50 sacos de cemento Portland"
          className={cell}
        />
      </div>

      {/* Capítulo + Partida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Capítulo</label>
          <select
            value={draft.categoryId}
            onChange={(e) => onChange(index, { categoryId: e.target.value })}
            disabled={!projectId}
            className={cell}
          >
            <option value="">— Sin capítulo —</option>
            {draft.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Partida</label>
          <select
            value={draft.itemId}
            onChange={(e) => onChange(index, { itemId: e.target.value })}
            disabled={!draft.categoryId}
            className={cell}
          >
            <option value="">— Sin partida —</option>
            {draft.items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.code ? `[${it.code}] ` : ''}
                {it.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tipo recurso + Cantidad + Unidad */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-xs font-medium text-app-muted mb-1">Tipo</label>
          <select
            value={draft.resourceType}
            onChange={(e) => onChange(index, { resourceType: e.target.value as ResourceType })}
            className={cell}
          >
            {RESOURCE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 sm:col-span-4">
          <label className="block text-xs font-medium text-app-muted mb-1">Cantidad</label>
          <input
            type="text"
            inputMode="decimal"
            value={draft.quantity}
            onChange={(e) => onChange(index, { quantity: e.target.value })}
            className={cell}
          />
        </div>
        <div className="col-span-6 sm:col-span-4">
          <label className="block text-xs font-medium text-app-muted mb-1">Unidad</label>
          <select value={draft.unit} onChange={(e) => onChange(index, { unit: e.target.value })} className={cell}>
            {MEASURE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Indicador planificado / disponible por línea */}
      {draft.availability && qtyNum > 0 && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
            exceedsPlan
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200'
          }`}
        >
          {exceedsPlan && <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
          <div>
            <p>
              Planificado en partida: <strong>{draft.availability.planned}</strong> · Disponible:{' '}
              <strong>{draft.availability.available}</strong>
            </p>
            {exceedsPlan && (
              <p className="mt-0.5 font-medium">
                Excede el plan en {(qtyNum - draft.availability.available).toFixed(2)}. La solicitud quedará en
                "Pendiente validación".
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulario principal ──────────────────────────────────────────────────────

const emptyItem = (): ItemDraft => ({
  description: '',
  categoryId: '',
  itemId: '',
  resourceType: 'material',
  quantity: '',
  unit: 'UND',
  availability: null,
  categories: [],
  items: [],
})

export function RequisitionForm({ projects, onSubmit, onCancel, saving, initialValues, submitLabel }: Props) {
  const [projectId, setProjectId] = useState(initialValues?.project_id ?? '')
  const [requestedBy, setRequestedBy] = useState(initialValues?.requested_by ?? '')
  const [requiredDate, setRequiredDate] = useState(initialValues?.required_date ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [lines, setLines] = useState<ItemDraft[]>(() => {
    if (initialValues?.items && initialValues.items.length > 0) {
      return initialValues.items.map((it) => ({
        description: it.description,
        categoryId: it.budget_category_id ?? '',
        itemId: it.budget_item_id ?? '',
        resourceType: (it.resource_type as ResourceType) ?? 'material',
        quantity: it.quantity != null ? String(it.quantity) : '',
        unit: it.unit ?? 'UND',
        availability: null,
        categories: [],
        items: [],
      }))
    }
    return [emptyItem()]
  })

  const [error, setError] = useState<string | null>(null)

  const updateLine = (idx: number, patch: Partial<ItemDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyItem()])

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const anyExceedsPlan = useMemo(() => {
    return lines.some((l) => {
      const q = parseDecimalInput(l.quantity) ?? 0
      return l.availability && q > l.availability.available
    })
  }, [lines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!projectId) {
      setError('Selecciona un proyecto')
      return
    }

    const validLines = lines.filter((l) => l.description.trim())
    if (validLines.length === 0) {
      setError('Agrega al menos una línea con descripción')
      return
    }

    const itemsPayload: RequisitionItemInput[] = validLines.map((l) => {
      const qty = parseDecimalInput(l.quantity)
      return {
        description: l.description.trim(),
        budget_category_id: l.categoryId || null,
        budget_item_id: l.itemId || null,
        resource_type: l.resourceType,
        quantity: qty !== null && qty > 0 ? qty : null,
        unit: l.unit || null,
      }
    })

    // El encabezado de la solicitud usa la primera línea como referencia.
    const first = itemsPayload[0]

    await onSubmit({
      project_id: projectId,
      description: first.description,
      requested_by: requestedBy,
      required_date: requiredDate || undefined,
      notes: notes || undefined,
      budget_category_id: first.budget_category_id,
      budget_item_id: first.budget_item_id,
      quantity_requested: first.quantity,
      unit: first.unit,
      resource_type: first.resource_type,
      items: itemsPayload,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Proyecto */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proyecto *</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
          disabled={!!initialValues?.project_id}
          className={inputClass}
        >
          <option value="">Seleccionar proyecto…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Fecha requerida */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Fecha requerida</label>
        <input
          type="date"
          value={requiredDate}
          onChange={(e) => setRequiredDate(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Líneas de material */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-app-muted">Materiales / recursos *</label>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir línea
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <ItemRow
              key={idx}
              draft={l}
              index={idx}
              projectId={projectId}
              total={lines.length}
              onChange={updateLine}
              onRemove={removeLine}
            />
          ))}
        </div>
        {anyExceedsPlan && (
          <p className="mt-1 text-xs text-amber-600">
            Una o más líneas exceden el plan. La solicitud entrará en revisión antes de pasar a cotización.
          </p>
        )}
      </div>

      {/* Solicitado por */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Solicitado por *</label>
        <input
          value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}
          required
          placeholder="Nombre"
          className={inputClass}
        />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:gap-3 sm:justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 sm:py-2 min-h-[44px] text-sm text-app-muted hover:text-app-text w-full sm:w-auto"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-3 sm:py-2 min-h-[44px] bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? 'Guardando…' : (submitLabel ?? 'Crear solicitud')}
        </button>
      </div>
    </form>
  )
}
