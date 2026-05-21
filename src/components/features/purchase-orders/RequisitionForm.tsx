import { useEffect, useMemo, useState } from 'react'
import type { Project, BudgetCategory, BudgetItem } from '@/types/database'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import { requisitionService } from '@/services/requisitionService'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import type { ResourceType } from '@/types/purchaseOrder'
import { AlertTriangle } from 'lucide-react'
import { parseDecimalInput } from '@/utils/decimalInput'

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
}

interface Props {
  projects: Project[]
  onSubmit: (payload: Payload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Mano de obra' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'other', label: 'Otro' },
]

const inputClass =
  'w-full border border-app-border rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

interface RequisitionBasicFieldsProps {
  projects: Project[]
  projectId: string
  setProjectId: (v: string) => void
  description: string
  setDescription: (v: string) => void
  requiredDate: string
  setRequiredDate: (v: string) => void
}

function RequisitionBasicFields({
  projects,
  projectId,
  setProjectId,
  description,
  setDescription,
  requiredDate,
  setRequiredDate,
}: RequisitionBasicFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proyecto *</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
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

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">
          ¿Qué se necesita comprar? *
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="Ej: 50 sacos de cemento Portland"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Fecha requerida</label>
        <input
          type="date"
          value={requiredDate}
          onChange={(e) => setRequiredDate(e.target.value)}
          className={inputClass}
        />
      </div>
    </>
  )
}

interface RequisitionBudgetSelectorsProps {
  categories: BudgetCategory[]
  items: BudgetItem[]
  categoryId: string
  setCategoryId: (v: string) => void
  itemId: string
  setItemId: (v: string) => void
  projectId: string
}

function RequisitionBudgetSelectors({
  categories,
  items,
  categoryId,
  setCategoryId,
  itemId,
  setItemId,
  projectId,
}: RequisitionBudgetSelectorsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Capítulo</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={!projectId}
          className={inputClass}
        >
          <option value="">— Sin capítulo —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Partida</label>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          disabled={!categoryId}
          className={inputClass}
        >
          <option value="">— Sin partida —</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.code ? `[${it.code}] ` : ''}
              {it.description}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

interface RequisitionResourceFieldsProps {
  resourceType: ResourceType
  setResourceType: (v: ResourceType) => void
  quantity: string
  setQuantity: (v: string) => void
  unit: string
  setUnit: (v: string) => void
  availability: { planned: number; available: number } | null
  qtyNum: number
  exceedsPlan: boolean
}

function RequisitionResourceFields({
  resourceType,
  setResourceType,
  quantity,
  setQuantity,
  unit,
  setUnit,
  availability,
  qtyNum,
  exceedsPlan,
}: RequisitionResourceFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-xs font-medium text-app-muted mb-1">Tipo de recurso</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceType)}
            className={inputClass}
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
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="col-span-6 sm:col-span-4">
          <label className="block text-xs font-medium text-app-muted mb-1">Unidad</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
            {MEASURE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {availability && qtyNum > 0 && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${
            exceedsPlan
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200'
          }`}
        >
          {exceedsPlan && <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
          <div>
            <p>
              Planificado en partida: <strong>{availability.planned}</strong> · Disponible (plan −
              ya comprometido): <strong>{availability.available}</strong>
            </p>
            {exceedsPlan && (
              <p className="mt-1 font-medium">
                Excede el plan en {(qtyNum - availability.available).toFixed(2)}. La solicitud
                quedará en "Pendiente validación" hasta que Planificación o el Director la liberen
                con motivo.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function RequisitionForm({ projects, onSubmit, onCancel, saving }: Props) {
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [requiredDate, setRequiredDate] = useState('')
  const [notes, setNotes] = useState('')

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [itemId, setItemId] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('material')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('UND')

  const [availability, setAvailability] = useState<{
    planned: number
    available: number
  } | null>(null)

  // Cargar capítulos cuando cambia el proyecto.
  useEffect(() => {
    let cancelled = false
    const promise = projectId
      ? budgetCategoryService.getByProject(projectId)
      : Promise.resolve([] as BudgetCategory[])
    promise
      .then((data) => {
        if (!cancelled) {
          setCategories(data)
          setCategoryId('')
          setItemId('')
        }
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Cargar partidas cuando cambia el capítulo.
  useEffect(() => {
    let cancelled = false
    const promise = categoryId
      ? budgetItemService.getByCategoryId(categoryId)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (!cancelled) {
          setItems(data)
          setItemId('')
        }
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [categoryId])

  // Auto-llenar unidad al elegir partida y recalcular disponibilidad.
  useEffect(() => {
    let cancelled = false
    const promise = itemId
      ? requisitionService.getAvailabilityForBudgetItem(itemId)
      : Promise.resolve(null)
    promise
      .then((a) => {
        if (cancelled) return
        if (!a) {
          setAvailability(null)
          return
        }
        const item = items.find((i) => i.id === itemId)
        if (item) setUnit(item.unit)
        setAvailability({ planned: a.planned_quantity, available: a.available_quantity })
      })
      .catch(() => {
        if (!cancelled) setAvailability(null)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, items])

  const [error, setError] = useState<string | null>(null)

  const qtyNum = parseDecimalInput(quantity) ?? 0
  const exceedsPlan = useMemo(() => {
    if (!availability) return false
    return qtyNum > availability.available
  }, [availability, qtyNum])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Cantidad (opcional): si está vacía => null; si tiene contenido y NaN => bloquear.
    let quantityRequested: number | null = null
    const qtyTrim = quantity.trim()
    if (qtyTrim) {
      const parsed = parseDecimalInput(qtyTrim)
      if (parsed === null) {
        setError('Cantidad inválida')
        return
      }
      quantityRequested = parsed > 0 ? parsed : null
    }

    await onSubmit({
      project_id: projectId,
      description,
      requested_by: requestedBy,
      required_date: requiredDate || undefined,
      notes: notes || undefined,
      budget_category_id: categoryId || null,
      budget_item_id: itemId || null,
      quantity_requested: quantityRequested,
      unit: unit || null,
      resource_type: resourceType,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RequisitionBasicFields
        projects={projects}
        projectId={projectId}
        setProjectId={setProjectId}
        description={description}
        setDescription={setDescription}
        requiredDate={requiredDate}
        setRequiredDate={setRequiredDate}
      />

      <RequisitionBudgetSelectors
        categories={categories}
        items={items}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        itemId={itemId}
        setItemId={setItemId}
        projectId={projectId}
      />

      <RequisitionResourceFields
        resourceType={resourceType}
        setResourceType={setResourceType}
        quantity={quantity}
        setQuantity={setQuantity}
        unit={unit}
        setUnit={setUnit}
        availability={availability}
        qtyNum={qtyNum}
        exceedsPlan={exceedsPlan}
      />

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
          {saving ? 'Guardando…' : 'Crear solicitud'}
        </button>
      </div>
    </form>
  )
}
