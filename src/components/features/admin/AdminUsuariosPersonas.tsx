import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Search } from 'lucide-react'
import { adminService, type AdminUser } from '@/services/adminService'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { AdminUserForm } from '@/components/features/admin/AdminUserForm'

export function AdminUsuariosPersonas() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AdminUser | undefined>()
  const [search, setSearch] = useState('')
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await adminService.listUsers())
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter((u) =>
      u.display_name?.toLowerCase().includes(q)
      || u.first_name?.toLowerCase().includes(q)
      || u.last_name?.toLowerCase().includes(q)
      || u.cedula?.toLowerCase().includes(q)
      || u.job_title?.toLowerCase().includes(q),
    )
  }, [search, users])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o puesto..."
            className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Persona</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Puesto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Cédula</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden lg:table-cell">Teléfono</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-app-hover group">
                  <td className="px-4 py-3">
                    <div className="font-medium text-app-text">
                      {u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Sin nombre'}
                    </div>
                    {u.is_director && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Director General</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-muted hidden sm:table-cell">{u.job_title || <span className="text-app-subtle">—</span>}</td>
                  <td className="px-4 py-3 text-app-muted hidden md:table-cell">{u.cedula || <span className="text-app-subtle">—</span>}</td>
                  <td className="px-4 py-3 text-app-muted hidden lg:table-cell">{u.phone || <span className="text-app-subtle">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      u.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-app-chip text-app-subtle'
                    }`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={() => setEditing(u)}
                      className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-app-muted">
                    No hay usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo usuario">
        <AdminUserForm
          mode="create"
          onCancel={() => setShowCreate(false)}
          onSaved={async () => {
            setShowCreate(false)
            success('Usuario creado correctamente')
            await load()
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar usuario">
        {editing && (
          <AdminUserForm
            mode="edit"
            initial={editing}
            onCancel={() => setEditing(undefined)}
            onSaved={async () => {
              setEditing(undefined)
              success('Cambios guardados')
              await load()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
