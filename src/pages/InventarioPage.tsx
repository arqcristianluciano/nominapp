import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Package, ArrowLeft, Plus, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import { inventoryService, type InventoryItem, type InventoryMovement } from '@/services/inventoryService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatRD } from '@/utils/currency'

const EMPTY_ITEM = { name: '', unit: 'unid', current_stock: 0, min_stock: 10, unit_cost: 0 }
const EMPTY_MOVEMENT = { item_id: '', type: 'in' as 'in' | 'out', quantity: 1, date: new Date().toISOString().split('T')[0], supplier_id: null, notes: '' }

export default function InventarioPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stock' | 'movements'>('stock')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [movForm, setMovForm] = useState(EMPTY_MOVEMENT)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [projectId])

  async function loadAll() {
    setLoading(true)
    try {
      const [its, movs] = await Promise.all([
        inventoryService.getItems(projectId!),
        inventoryService.getMovements(projectId!),
      ])
      setItems(its)
      setMovements(movs)
    } finally { setLoading(false) }
  }

  const lowStock = useMemo(() => inventoryService.getLowStockItems(items), [items])

  async function handleAddItem() {
    if (!itemForm.name.trim()) return
    setSaving(true)
    try {
      await inventoryService.createItem({ ...itemForm, project_id: projectId! })
      setShowItemForm(false)
      setItemForm(EMPTY_ITEM)
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleAddMovement() {
    if (!movForm.item_id) return
    setSaving(true)
    try {
      await inventoryService.addMovement({ ...movForm, project_id: projectId!, supplier_id: null })
      setShowMovForm(false)
      setMovForm(EMPTY_MOVEMENT)
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await inventoryService.deleteItem(deleteId)
    setDeleteId(null)
    await loadAll()
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/proyectos/${projectId}`} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Package className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Inventario de Materiales</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMovForm(true)} className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover transition-colors">
            <ArrowUpCircle className="w-4 h-4" />Movimiento
          </button>
          <button onClick={() => setShowItemForm(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />Material
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Stock mínimo alcanzado</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              {lowStock.map((i) => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Item form */}
      {showItemForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">Nuevo material</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Nombre *</label>
              <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Ej: Cemento Portland" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Unidad</label>
              <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="sacos, m³, unid" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Costo unitario (RD$)</label>
              <input type="number" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Stock inicial</label>
              <input type="number" value={itemForm.current_stock} onChange={(e) => setItemForm({ ...itemForm, current_stock: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Stock mínimo (alerta)</label>
              <input type="number" value={itemForm.min_stock} onChange={(e) => setItemForm({ ...itemForm, min_stock: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowItemForm(false)} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleAddItem} disabled={saving || !itemForm.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Movement form */}
      {showMovForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">Registrar movimiento</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Material *</label>
              <select value={movForm.item_id} onChange={(e) => setMovForm({ ...movForm, item_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} (stock: {i.current_stock} {i.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Tipo</label>
              <select value={movForm.type} onChange={(e) => setMovForm({ ...movForm, type: e.target.value as 'in' | 'out' })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="in">Entrada</option>
                <option value="out">Salida</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Cantidad</label>
              <input type="number" min={1} value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Fecha</label>
              <input type="date" value={movForm.date} onChange={(e) => setMovForm({ ...movForm, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs text-app-muted block mb-1">Notas</label>
              <input value={movForm.notes} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })}
                placeholder="Compra OC-001, uso en vaciado..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowMovForm(false)} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleAddMovement} disabled={saving || !movForm.item_id}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-app-hover rounded-lg p-1 w-fit">
        {(['stock', 'movements'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${tab === t ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-muted hover:text-app-text'}`}>
            {t === 'stock' ? 'Stock actual' : 'Movimientos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
      ) : tab === 'stock' ? (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-hover/50 text-xs text-app-muted">
                <th className="text-left px-4 py-2.5 font-medium">Material</th>
                <th className="text-center px-4 py-2.5 font-medium">Unidad</th>
                <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                <th className="text-right px-4 py-2.5 font-medium">Mínimo</th>
                <th className="text-right px-4 py-2.5 font-medium">Costo unit.</th>
                <th className="text-right px-4 py-2.5 font-medium">Valor total</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {items.map((item) => {
                const isLow = item.current_stock <= item.min_stock
                return (
                  <tr key={item.id} className={`hover:bg-app-hover/50 ${isLow ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                    <td className="px-4 py-3 font-medium text-app-text">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-app-muted">{item.unit}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-yellow-600' : 'text-app-text'}`}>{item.current_stock}</td>
                    <td className="px-4 py-3 text-right text-app-muted">{item.min_stock}</td>
                    <td className="px-4 py-3 text-right text-app-muted">{formatRD(item.unit_cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-app-text">{formatRD(item.current_stock * item.unit_cost)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {items.length > 0 && (
                <tr className="bg-app-hover/30 font-semibold text-sm">
                  <td colSpan={5} className="px-4 py-2.5 text-app-muted">Total en inventario</td>
                  <td className="px-4 py-2.5 text-right text-app-text">
                    {formatRD(items.reduce((s, i) => s + i.current_stock * i.unit_cost, 0))}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
          {items.length === 0 && <div className="text-center py-8 text-app-muted text-sm">Sin materiales registrados.</div>}
        </div>
      ) : (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-hover/50 text-xs text-app-muted">
                <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium">Material</th>
                <th className="text-center px-4 py-2.5 font-medium">Tipo</th>
                <th className="text-right px-4 py-2.5 font-medium">Cantidad</th>
                <th className="text-left px-4 py-2.5 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-app-hover/50">
                  <td className="px-4 py-3 text-app-muted whitespace-nowrap">
                    {new Date(m.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-app-text">{m.item?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {m.type === 'in'
                      ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><ArrowDownCircle className="w-3.5 h-3.5" />Entrada</span>
                      : <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><ArrowUpCircle className="w-3.5 h-3.5" />Salida</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity} {m.item?.unit ?? ''}
                  </td>
                  <td className="px-4 py-3 text-app-muted text-xs">{m.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && <div className="text-center py-8 text-app-muted text-sm">Sin movimientos registrados.</div>}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar material"
        message="¿Eliminar este material del inventario? Se perderá el historial de movimientos."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
