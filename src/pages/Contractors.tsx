import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, HardHat, Search, Pencil, ChevronRight, Phone } from 'lucide-react'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { ContractorForm } from '@/components/features/contractors/ContractorForm'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Contractor } from '@/types/database'

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  check: 'Cheque',
  transfer: 'Transferencia',
}

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contractor | undefined>()
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setContractors(await contractorService.getAll()) }
    finally { setLoading(false) }
  }

  async function handleCreate(data: Parameters<typeof contractorService.create>[0]) {
    setSaving(true)
    try {
      await contractorService.create(data)
      setShowForm(false)
      await load()
      success('Contratista creado correctamente')
    } catch { error('No se pudo crear el contratista') }
    finally { setSaving(false) }
  }

  async function handleUpdate(data: Parameters<typeof contractorService.create>[0]) {
    if (!editing) return
    setSaving(true)
    try {
      await contractorService.update(editing.id, data as any)
      setEditing(undefined)
      await load()
      success('Contratista actualizado')
    } catch { error('No se pudo actualizar el contratista') }
    finally { setSaving(false) }
  }

  const filtered = contractors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = contractors.filter((c) => c.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Contratistas</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-app-muted">{contractors.length} registrados</span>
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
          placeholder="Buscar contratista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : filtered.length === 0 ? (
        <EmptyContractors hasSearch={!!search} onNew={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group bg-app-surface rounded-xl border border-app-border p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <Link to={`/contratistas/${c.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-app-text truncate text-sm">{c.name}</p>
                    <p className="text-xs text-app-muted mt-0.5 truncate">{c.specialty || 'Sin especialidad'}</p>
                    {c.phone && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-app-subtle">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-app-chip text-app-muted font-medium">
                        {METHOD_LABEL[c.payment_method] || c.payment_method}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        c.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-app-chip text-app-subtle'
                      }`}>
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(c)}
                    className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/contratistas/${c.id}`}
                    className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Ver detalle"
                  >
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

function EmptyContractors({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto mb-4">
        <HardHat className="w-7 h-7 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="text-base font-semibold text-app-text mb-1">
        {hasSearch ? 'Sin resultados' : 'Sin contratistas aún'}
      </p>
      <p className="text-sm text-app-muted mb-5">
        {hasSearch ? 'Intenta con otro nombre o especialidad' : 'Registra contratistas para asignarlos a obras'}
      </p>
      {!hasSearch && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo contratista
        </button>
      )}
    </div>
  )
}
