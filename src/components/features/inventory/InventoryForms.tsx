import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/services/inventoryService'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import { materialsCatalogService, type MaterialCatalogItem } from '@/services/materialsCatalogService'
import { parseDecimalInput } from '@/utils/decimalInput'
import type { InventoryMovementFormState } from './inventoryConfig'

/**
 * Sincroniza un input decimal en formato local (RD) con el estado numérico del
 * formulario padre. Mantiene un string editable para que el usuario pueda
 * teclear separadores decimales/miles sin perder caracteres, y propaga el
 * número parseado al padre cuando es válido.
 */
function formatNumberForInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (!Number.isFinite(value)) return ''
  return String(value)
}

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
  'w-full min-h-[44px] px-3 py-2.5 sm:py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

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
      <select value={value ?? ''} onChange={(e) => onPick(e.target.value)} className={INPUT_CLS}>
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
  // Buffers locales para inputs decimales: permiten teclear separadores RD
  // ("1.234,56") sin que el coerción a number trunque caracteres mid-edit.
  const [unitCostStr, setUnitCostStr] = useState(() => formatNumberForInput(form.unit_cost))
  const [currentStockStr, setCurrentStockStr] = useState(() => formatNumberForInput(form.current_stock))
  const [minStockStr, setMinStockStr] = useState(() => formatNumberForInput(form.min_stock))

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
    const nextMinStock = form.min_stock || item.default_min_stock
    onChange({
      ...form,
      material_catalog_id: item.id,
      name: form.name || item.description,
      unit: item.unit,
      min_stock: nextMinStock,
    })
    setMinStockStr(formatNumberForInput(nextMinStock))
  }

  const handleDecimalChange =
    (field: 'unit_cost' | 'current_stock' | 'min_stock', setter: (s: string) => void) => (value: string) => {
      setter(value)
      // Solo propagar cuando el string parsea limpiamente (incluido vacío → 0).
      // Strings intermedios ("1." o "1,") quedan en el buffer local hasta que
      // el usuario complete el número; al disparar handleSave reparseamos.
      const trimmed = value.trim()
      if (!trimmed) {
        onChange({ ...form, [field]: 0 })
        return
      }
      const parsed = parseDecimalInput(value)
      if (parsed !== null) {
        onChange({ ...form, [field]: parsed })
      }
    }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Nuevo material</h3>
      <CatalogPicker catalog={catalog} value={form.material_catalog_id} onPick={handleCatalogPick} />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej: Cemento Portland"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Unidad</label>
          <input
            value={form.unit}
            onChange={(e) => onChange({ ...form, unit: e.target.value })}
            placeholder="sacos, m3, unid"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Costo unitario (RD$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={unitCostStr}
            onChange={(e) => handleDecimalChange('unit_cost', setUnitCostStr)(e.target.value)}
            placeholder="0,00"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 gap-3 sm:contents">
          <div className="sm:col-span-1">
            <label className="text-xs text-app-muted block mb-1">Stock inicial</label>
            <input
              type="text"
              inputMode="decimal"
              value={currentStockStr}
              onChange={(e) => handleDecimalChange('current_stock', setCurrentStockStr)(e.target.value)}
              placeholder="0"
              className={INPUT_CLS}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-app-muted block mb-1">Stock mínimo (alerta)</label>
            <input
              type="text"
              inputMode="decimal"
              value={minStockStr}
              onChange={(e) => handleDecimalChange('min_stock', setMinStockStr)(e.target.value)}
              placeholder="0"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
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
  // Buffers locales para inputs decimales en formato RD.
  const [quantityStr, setQuantityStr] = useState(() => formatNumberForInput(form.quantity))
  const [unitCostStr, setUnitCostStr] = useState(() => formatNumberForInput(form.unit_cost))

  useEffect(() => {
    let cancelled = false
    const promise = projectId ? budgetCategoryService.getByProject(projectId) : Promise.resolve([] as BudgetCategory[])
    promise
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    const promise = form.budget_category_id
      ? budgetItemService.getByCategoryId(form.budget_category_id)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (!cancelled) setBudgetItems(data)
      })
      .catch(() => {
        if (!cancelled) setBudgetItems([])
      })
    return () => {
      cancelled = true
    }
  }, [form.budget_category_id])

  const isOut = form.type === 'out'

  const handleQuantityChange = (value: string) => {
    setQuantityStr(value)
    const trimmed = value.trim()
    if (!trimmed) {
      onChange({ ...form, quantity: 0 })
      return
    }
    const parsed = parseDecimalInput(value)
    // Strings mid-edit ("1." o "1,") mantienen el último número propagado;
    // handleSave reparsea antes del submit final.
    if (parsed !== null) {
      onChange({ ...form, quantity: parsed })
    }
  }

  const handleUnitCostChange = (value: string) => {
    setUnitCostStr(value)
    if (!value.trim()) {
      onChange({ ...form, unit_cost: null })
      return
    }
    const parsed = parseDecimalInput(value)
    if (parsed !== null) {
      onChange({ ...form, unit_cost: parsed })
    }
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Registrar movimiento</h3>

      {/* Quick toggle entrada/salida — siempre visible y prominente en mobile */}
      <div
        role="tablist"
        aria-label="Tipo de movimiento"
        className="grid grid-cols-2 gap-1 bg-app-hover rounded-lg p-1"
      >
        {(['in', 'out'] as const).map((value) => {
          const active = form.type === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                onChange({
                  ...form,
                  type: value,
                  ...(value === 'in'
                    ? { budget_category_id: null, budget_item_id: null }
                    : { purchase_order_id: null }),
                })
              }
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                active
                  ? value === 'in'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-red-600 text-white shadow-sm'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              {value === 'in' ? 'Entrada' : 'Salida'}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-4">
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
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Cantidad</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={quantityStr}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
            className={INPUT_CLS}
          />
        </div>
        {form.type === 'in' && (
          <div className="sm:col-span-4">
            <label className="text-xs text-app-muted block mb-1">Costo unitario</label>
            <input
              type="text"
              inputMode="decimal"
              value={unitCostStr}
              onChange={(e) => handleUnitCostChange(e.target.value)}
              placeholder="Precio efectivo"
              className={INPUT_CLS}
            />
          </div>
        )}

        {isOut && (
          <StockOverrideFields form={form} categories={categories} budgetItems={budgetItems} onChange={onChange} />
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
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-1.5">
          Toda salida debe imputarse al menos a un capítulo (regla de almacén 7.4).
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.item_id || (isOut && !form.budget_category_id && !form.budget_item_id)}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
