import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, HardHat, Search, Pencil, ChevronRight } from 'lucide-react'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { ContractorForm } from '@/components/features/contractors/ContractorForm'
import type { Contractor } from '@/types/database'

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contractor | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await contractorService.getAll()
      setContractors(data)
    } finally { setLoading(false) }
  }

  async function handleCreate(data: Parameters<typeof contractorService.create>[0]) {
    setSaving(true)
    try {
      await contractorService.create(data)
      setShowForm(false)
      await load()
    } finally { setSaving(false) }
  }

  async function handleUpdate(data: Parameters<typeof contractorService.create>[0]) {
    if (!editing) return
    setSaving(true)
    try {
      await contractorService.update(editing.id, data as any)
      setEditing(undefined)
      await load()
    } finally { setSaving(false) }
  }

  const filtered = contractors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(search.toLowerCase())
  )

  const methodLabel: Record<string, string> = { cash: 'Efectivo', check: 'Cheque', transfer: 'Transferencia' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contratistas</h1>
          <p className="text-sm text-gray-500 mt-1">{contractors.length} registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar contratista..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      {loading ? <div className="text-sm text-gray-500">Cargando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <Link to={`/contratistas/${c.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.specialty || 'Sin especialidad'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{methodLabel[c.payment_method] || c.payment_method}</span>
                      <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(c)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <Link to={`/contratistas/${c.id}`} className="p-1.5 text-gray-300 hover:text-blue-500">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo contratista">
        <ContractorForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar contratista">
        {editing && <ContractorForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(undefined)} saving={saving} />}
      </Modal>
    </div>
  )
}
