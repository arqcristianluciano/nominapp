import type { InventoryItem, InventoryMovement } from '@/services/inventoryService'

interface ItemFormProps {
  form: { name: string; unit: string; current_stock: number; min_stock: number; unit_cost: number }
  saving: boolean
  onChange: (next: { name: string; unit: string; current_stock: number; min_stock: number; unit_cost: number }) => void
  onCancel: () => void
  onSave: () => void
}

export function InventoryItemForm({ form, saving, onChange, onCancel, onSave }: ItemFormProps) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Nuevo material</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><label className="text-xs text-app-muted block mb-1">Nombre *</label><input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="Ej: Cemento Portland" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Unidad</label><input value={form.unit} onChange={(e) => onChange({ ...form, unit: e.target.value })} placeholder="sacos, m3, unid" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Costo unitario (RD$)</label><input type="number" value={form.unit_cost} onChange={(e) => onChange({ ...form, unit_cost: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Stock inicial</label><input type="number" value={form.current_stock} onChange={(e) => onChange({ ...form, current_stock: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Stock mínimo (alerta)</label><input type="number" value={form.min_stock} onChange={(e) => onChange({ ...form, min_stock: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  )
}

interface MovementFormProps {
  form: Pick<InventoryMovement, 'item_id' | 'type' | 'quantity' | 'date' | 'notes'>
  items: InventoryItem[]
  saving: boolean
  onChange: (next: Pick<InventoryMovement, 'item_id' | 'type' | 'quantity' | 'date' | 'notes'>) => void
  onCancel: () => void
  onSave: () => void
}

export function InventoryMovementForm({ form, items, saving, onChange, onCancel, onSave }: MovementFormProps) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Registrar movimiento</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2"><label className="text-xs text-app-muted block mb-1">Material *</label><select value={form.item_id} onChange={(e) => onChange({ ...form, item_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Seleccionar...</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} (stock: {item.current_stock} {item.unit})</option>)}</select></div>
        <div><label className="text-xs text-app-muted block mb-1">Tipo</label><select value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as 'in' | 'out' })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="in">Entrada</option><option value="out">Salida</option></select></div>
        <div><label className="text-xs text-app-muted block mb-1">Cantidad</label><input type="number" min={1} value={form.quantity} onChange={(e) => onChange({ ...form, quantity: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Fecha</label><input type="date" value={form.date} onChange={(e) => onChange({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div className="sm:col-span-3"><label className="text-xs text-app-muted block mb-1">Notas</label><input value={form.notes ?? ''} onChange={(e) => onChange({ ...form, notes: e.target.value })} placeholder="Compra OC-001, uso en vaciado..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.item_id} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  )
}
