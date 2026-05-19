import { useCallback, useEffect, useState } from 'react'
import { Package, Plus, Search, X } from 'lucide-react'
import { materialsCatalogService, type MaterialCatalogItem } from '@/services/materialsCatalogService'
import { useToast } from '@/components/ui/Toast'

interface FormState {
  code: string
  description: string
  unit: string
  default_min_stock: number
  category: string
  notes: string
}

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  unit: 'unid',
  default_min_stock: 0,
  category: '',
  notes: '',
}

export default function MaterialsCatalogPage() {
  const [items, setItems] = useState<MaterialCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await materialsCatalogService.getAll(true))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = items.filter((it) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      it.code.toLowerCase().includes(q) ||
      it.description.toLowerCase().includes(q) ||
      (it.category ?? '').toLowerCase().includes(q)
    )
  })

  async function handleSave() {
    if (!form.description.trim() || !form.unit.trim()) return
    setSaving(true)
    try {
      await materialsCatalogService.create({
        code: form.code.trim() || undefined,
        description: form.description.trim(),
        unit: form.unit.trim(),
        default_min_stock: form.default_min_stock,
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      success('Material agregado al catálogo')
      await load()
    } catch {
      error('No se pudo crear el material')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: MaterialCatalogItem) {
    await materialsCatalogService.setActive(item.id, !item.is_active)
    await load()
  }

  const input =
    'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Catálogo de Materiales</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Nuevo material
        </button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-app-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, descripción o categoría..."
            className="flex-1 px-2 py-1.5 text-sm bg-transparent text-app-text focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-app-subtle hover:text-app-text">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">Nuevo material</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-app-muted block mb-1">Código (auto si vacío)</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="MAT-0001"
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Descripción *</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Cemento Portland gris"
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Unidad *</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="sacos"
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Categoría</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Cemento / Acero / ..."
                className={input}
              />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Stock mínimo default</label>
              <input
                type="number"
                value={form.default_min_stock}
                onChange={(e) => setForm({ ...form, default_min_stock: +e.target.value })}
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              disabled={saving || !form.description.trim() || !form.unit.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <p className="text-base font-semibold text-app-text mb-1">Sin materiales</p>
          <p className="text-sm text-app-muted">Crea el primero para empezar el catálogo global.</p>
        </div>
      ) : (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-app-chip text-app-muted text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-right">Unidad</th>
                <th className="px-3 py-2 text-right">Stock mín.</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-t border-app-border">
                  <td className="px-3 py-2 font-mono text-xs">{it.code}</td>
                  <td className="px-3 py-2">{it.description}</td>
                  <td className="px-3 py-2 text-app-muted">{it.category ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{it.unit}</td>
                  <td className="px-3 py-2 text-right">{it.default_min_stock}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        it.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-app-chip text-app-subtle'
                      }`}
                    >
                      {it.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleToggleActive(it)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {it.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
