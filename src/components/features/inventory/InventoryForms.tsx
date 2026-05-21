import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/services/inventoryService'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import {
  materialsCatalogService,
  type MaterialCatalogItem,
} from '@/services/materialsCatalogService'
import type { InventoryMovementFormState } from './inventoryConfig'

export interface ItemFormState {
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  material_catalog_id: string | null
}

interface ItemFormProps {
  form: ItemFormState
  saving: boolean
  onChange: (next: ItemFormState) => void
  onCancel: () => void
  onSave: () => void
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

function CatalogPicker({
  catalog,
  value,
  onPick,
}: {
  catalog: MaterialCatalogItem[]
  value: string | null
  onPick: (catalogId: string) => void
}) {
  if (catalog.length === 0) return null
  return (
    <div>
      <label className="text-xs text-app-muted block mb-1">Material del catálogo global (opcional)</label>
      <select
        value={value ?? ''}
        onChange={(e) => onPick(e.target.value)}
        className={INPUT_CLS}
      >
        <option value="">— Material libre —</option>
        {catalog.map((c) => (
          <option key={c.id} value={c.id}>
            [{c.code}] {c.description} · {c.unit}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-app-subtle mt-1">
        Seleccionar enlaza este ítem al código global y habilita el histórico transversal de precios.
      </p>
    </div>
  )
}

export function InventoryItemForm({ form, saving, onChange, onCancel, onSave }: ItemFormProps) {
  const [catalog, setCatalog] = useState<MaterialCatalogItem[]>([])

  useEffect(() => {
    let cancelled = false
    materialsCatalogService
      .getAll()
      .then((items) => {
        if (!cancelled) setCatalog(items)
      })
      .catch(() => {
        if (!cancelled) setCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleCatalogPick(catalogId: string) {
    if (!catalogId) {
      onChange({ ...form, material_catalog_id: null })
      return
    }
    const item = catalog.find((c) => c.id === catalogId)
    if (!item) return
    onChange({
      ...form,
      material_catalog_id: item.id,
      name: form.name || item.description,
      unit: item.unit,
      min_stock: form.min_stock || item.default_min_stock,
    })
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Nuevo material</h3>
      <CatalogPicker catalog={catalog} value={form.material_catalog_id} onPick={handleCatalogPick} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><label className="text-xs text-app-muted block mb-1">Nombre *</label><input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="Ej: Cemento Portland" className={INPUT_CLS} /></div>
        <div><label className="text-xs text-app-muted block mb-1">Unidad</label><input value={form.unit} onChange={(e) => onChange({ ...form, unit: e.target.value })} placeholder="sacos, m3, unid" className={INPUT_CLS} /></div>
        <div><label className="text-xs text-app-muted block mb-1">Costo unitario (RD$)</label><input type="number" value={form.unit_cost} onChange={(e) => onChange({ ...form, unit_cost: +e.target.value })} className={INPUT_CLS} /></div>
        <div><label className="text-xs text-app-muted block mb-1">Stock inicial</label><input type="number" value={form.current_stock} onChange={(e) => onChange({ ...form, current_stock: +e.target.value })} className={INPUT_CLS} /></div>
        <div><label className="text-xs text-app-muted block mb-1">Stock mínimo (alerta)</label><input type="number" value={form.min_stock} onChange={(e) => onChange({ ...form, min_stock: +e.target.value })} className={INPUT_CLS} /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  )
}

interface MovementFormProps {
  form: InventoryMovementFormState
  items: InventoryItem[]
  projectId: string
  saving: boolean
  onChange: (next: InventoryMovementFormState) => void
  onCancel: () => void
  onSave: () => void
}

interface StockOverrideFieldsProps {
  form: InventoryMovementFormState
  categories: BudgetCategory[]
  budgetItems: BudgetItem[]
  onChange: (next: InventoryMovementFormState) => void
}

/**
 * Campos extra que se muestran en una salida (movimiento que puede
 * afectar negativamente el stock y derivar en un override).
 * Incluyen la imputación obligatoria a capítulo y partida opcional
 * más la advertencia de regla de almacén 7.4.
 */
function StockOverrideFields({ form, categories, budgetItems, onChange }: StockOverrideFieldsProps) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="text-xs text-app-muted block mb-1">Capítulo imputado *</label>
        <select
          value={form.budget_category_id ?? ''}
          onChange={(e) =>
            onChange({
              ...form,
              budget_category_id: e.target.value || null,
              budget_item_id: null,
            })
          }
          className={INPUT_CLS}
        >
          <option value="">Seleccionar...</option>
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
          value={form.budget_item_id ?? ''}
          onChange={(e) => onChange({ ...form, budget_item_id: e.target.value || null })}
          disabled={!form.budget_category_id}
          className={INPUT_CLS}
        >
          <option value="">— Sin partida específica —</option>
          {budgetItems.map((it) => (
            <option key={it.id} value={it.id}>
              {it.code ? `[${it.code}] ` : ''}
              {it.description}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export function InventoryMovementForm({
  form,
  items,
  projectId,
  saving,
  onChange,
  onCancel,
  onSave,
}: MovementFormProps) {
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])

  useEffect(() => {
    let cancelled = false
    const promise = projectId
      ? budgetCategoryService.getByProject(projectId)
      : Promise.resolve([] as BudgetCategory[])
    promise
      .then((data) => { if (!cancelled) setCategories(data) })
      .catch(() => { if (!cancelled) setCategories([]) })
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    const promise = form.budget_category_id
      ? budgetItemService.getByCategoryId(form.budget_category_id)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => { if (!cancelled) setBudgetItems(data) })
      .catch(() => { if (!cancelled) setBudgetItems([]) })
    return () => { cancelled = true }
  }, [form.budget_category_id])

  const isOut = form.type === 'out'

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Registrar movimiento</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Material *</label>
          <select
            value={form.item_id}
            onChange={(e) => onChange({ ...form, item_id: e.target.value })}
            className={INPUT_CLS}
          >
            <option value="">Seleccionar...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (stock: {item.current_stock} {item.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Tipo</label>
          <select
            value={form.type}
            onChange={(e) =>
              onChange({
                ...form,
                type: e.target.value as 'in' | 'out',
                // Limpiar imputación si pasa a entrada; OC sólo aplica a entradas.
                ...(e.target.value === 'in'
                  ? { budget_category_id: null, budget_item_id: null }
                  : { purchase_order_id: null }),
              })
            }
            className={INPUT_CLS}
          >
            <option value="in">Entrada</option>
            <option value="out">Salida</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Cantidad</label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => onChange({ ...form, quantity: +e.target.value })}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
            className={INPUT_CLS}
          />
        </div>
        {form.type === 'in' && (
          <div>
            <label className="text-xs text-app-muted block mb-1">Costo unitario</label>
            <input
              type="number"
              step="0.01"
              value={form.unit_cost ?? ''}
              onChange={(e) => onChange({ ...form, unit_cost: e.target.value ? +e.target.value : null })}
              placeholder="Precio efectivo"
              className={INPUT_CLS}
            />
          </div>
        )}

        {isOut && (
          <StockOverrideFields
            form={form}
            categories={categories}
            budgetItems={budgetItems}
            onChange={onChange}
          />
        )}

        <div className="sm:col-span-4">
          <label className="text-xs text-app-muted block mb-1">Notas</label>
          <input
            value={form.notes ?? ''}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder={isOut ? 'Uso en vaciado, columna eje 4…' : 'Compra OC-001, factura 12345…'}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {isOut && !form.budget_category_id && !form.budget_item_id && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Toda salida debe imputarse al menos a un capítulo (regla de almacén 7.4).
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={
            saving ||
            !form.item_id ||
            (isOut && !form.budget_category_id && !form.budget_item_id)
          }
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
