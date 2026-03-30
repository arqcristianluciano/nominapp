import { useEffect, useState } from 'react'
import { Plus, Truck, Search, Pencil } from 'lucide-react'
import { supplierService } from '@/services/supplierService'
import { Modal } from '@/components/ui/Modal'
import { SupplierForm } from '@/components/features/suppliers/SupplierForm'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Supplier } from '@/types/database'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>()
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setSuppliers(await supplierService.getAll()) }
    finally { setLoading(false) }
  }

  async function handleCreate(data: Parameters<typeof supplierService.create>[0]) {
    setSaving(true)
    try {
      await supplierService.create(data)
      setShowForm(false)
      await load()
      success('Suplidor creado correctamente')
    } catch { error('No se pudo crear el suplidor') }
    finally { setSaving(false) }
  }

  async function handleUpdate(data: Parameters<typeof supplierService.create>[0]) {
    if (!editing) return
    setSaving(true)
    try {
      await supplierService.update(editing.id, data)
      setEditing(undefined)
      await load()
      success('Suplidor actualizado')
    } catch { error('No se pudo actualizar el suplidor') }
    finally { setSaving(false) }
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rnc?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = suppliers.filter((s) => s.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Suplidores</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-app-muted">{suppliers.length} registrados</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">
                {activeCount} activos
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input
          type="text"
          placeholder="Buscar suplidor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptySuppliers hasSearch={!!search} onNew={() => setShowForm(true)} />
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Suplidor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">RNC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Condición de pago</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-app-hover transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-app-text text-sm">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-app-muted hidden sm:table-cell">
                    {s.rnc || <span className="text-app-subtle">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-app-muted hidden md:table-cell">
                    {s.payment_terms || <span className="text-app-subtle">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      s.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-app-chip text-app-subtle'
                    }`}>
                      {s.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-2 py-3.5">
                    <button
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proveedor">
        <SupplierForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar proveedor">
        {editing && <SupplierForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(undefined)} saving={saving} />}
      </Modal>
    </div>
  )
}

function EmptySuppliers({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto mb-4">
        <Truck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
      </div>
      <p className="text-base font-semibold text-app-text mb-1">
        {hasSearch ? 'Sin resultados' : 'Sin suplidores aún'}
      </p>
      <p className="text-sm text-app-muted mb-5">
        {hasSearch ? 'Intenta con otro nombre o RNC' : 'Registra suplidores para asociarlos a órdenes de compra'}
      </p>
      {!hasSearch && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo suplidor
        </button>
      )}
    </div>
  )
}
