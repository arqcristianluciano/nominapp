import { useEffect, useState } from 'react'
import { Plus, Truck, Search, Pencil } from 'lucide-react'
import { supplierService } from '@/services/supplierService'
import { Modal } from '@/components/ui/Modal'
import { SupplierForm } from '@/components/features/suppliers/SupplierForm'
import type { Supplier } from '@/types/database'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setSuppliers(await supplierService.getAll()) }
    finally { setLoading(false) }
  }

  async function handleCreate(data: Parameters<typeof supplierService.create>[0]) {
    setSaving(true)
    try { await supplierService.create(data); setShowForm(false); await load() }
    finally { setSaving(false) }
  }

  async function handleUpdate(data: Parameters<typeof supplierService.create>[0]) {
    if (!editing) return
    setSaving(true)
    try { await supplierService.update(editing.id, data); setEditing(undefined); await load() }
    finally { setSaving(false) }
  }

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Suplidores</h1>
          <p className="text-sm text-app-muted mt-1">{suppliers.length} registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input type="text" placeholder="Buscar suplidor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? <div className="text-sm text-app-muted">Cargando...</div> : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-app-bg border-b border-app-border">
              <th className="text-left px-4 py-3 font-medium text-app-muted">Suplidor</th>
              <th className="text-left px-4 py-3 font-medium text-app-muted hidden sm:table-cell">RNC</th>
              <th className="text-left px-4 py-3 font-medium text-app-muted hidden md:table-cell">Condición de pago</th>
              <th className="text-center px-4 py-3 font-medium text-app-muted w-20">Estado</th>
              <th className="w-10" />
            </tr></thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-app-hover">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Truck className="w-4 h-4 text-app-subtle shrink-0" /><span className="font-medium text-app-text">{s.name}</span></div></td>
                  <td className="px-4 py-3 text-app-muted hidden sm:table-cell">{s.rnc || '—'}</td>
                  <td className="px-4 py-3 text-app-muted hidden md:table-cell">{s.payment_terms || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={`w-2 h-2 inline-block rounded-full ${s.is_active ? 'bg-green-500' : 'bg-app-subtle'}`} /></td>
                  <td className="px-2 py-3"><button onClick={() => setEditing(s)} className="p-1.5 text-app-subtle hover:text-app-muted"><Pencil className="w-3.5 h-3.5" /></button></td>
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
