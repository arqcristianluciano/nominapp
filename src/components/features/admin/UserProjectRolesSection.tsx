import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adminService, type AdminUser } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { ProjectRole } from '@/hooks/useProjectRoles'

interface Props {
  user: AdminUser
  onRefresh: () => void
}

interface ProjectLite {
  id: string
  name: string
  code: string | null
}

const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'director_general', label: 'Director General' },
  { value: 'director_proyecto', label: 'Director de Proyecto' },
  { value: 'planificacion', label: 'Planificación' },
  { value: 'ingeniero_obra', label: 'Ingeniero de Obra' },
  { value: 'supervisor_especializado', label: 'Supervisor Especializado' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'almacenista', label: 'Almacenista' },
  { value: 'contabilidad', label: 'Contabilidad' },
]

const ROLE_LABEL: Record<ProjectRole, string> = Object.fromEntries(
  PROJECT_ROLES.map((r) => [r.value, r.label]),
) as Record<ProjectRole, string>

const inputCls =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'text-xs font-medium text-app-muted mb-1 block'

export function UserProjectRolesSection({ user, onRefresh }: Props) {
  const memberships = useMemo(() => user.project_memberships ?? [], [user.project_memberships])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [allProjects, setAllProjects] = useState<ProjectLite[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [removing, setRemoving] = useState<{ projectId: string; role: ProjectRole } | undefined>()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const { success, error } = useToast()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  // D6: si se cambian los roles del propio usuario, refrescamos la sesión para
  // que los permisos apliquen sin cerrar y volver a abrir sesión.
  const refreshSessionIfSelf = useCallback(async () => {
    if (user.id === currentUserId) await refreshUser()
  }, [user.id, currentUserId, refreshUser])

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const { data, error: err } = await supabase.from('projects').select('id, name, code').order('name')
      if (err) throw err
      const list = (data ?? []) as ProjectLite[]
      setAllProjects(list)
      const ids = new Set(memberships.map((m) => m.project_id))
      const map: Record<string, ProjectLite> = {}
      for (const p of list) {
        if (ids.has(p.id)) map[p.id] = p
      }
      // Si hay memberships con proyectos no incluidos en la lista general (poco
      // probable pero defensivo), pedirlos puntualmente con .in().
      const missingIds = [...ids].filter((id) => !map[id])
      if (missingIds.length) {
        const { data: extra, error: err2 } = await supabase
          .from('projects')
          .select('id, name, code')
          .in('id', missingIds)
        if (err2) throw err2
        for (const p of (extra ?? []) as ProjectLite[]) {
          map[p.id] = p
        }
      }
      setProjects(map)
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos')
    } finally {
      setLoadingProjects(false)
    }
  }, [memberships, error])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  async function handleRemove(projectId: string, role: ProjectRole) {
    const key = `${projectId}:${role}`
    setBusyKey(key)
    try {
      await adminService.removeProjectRole(user.id, projectId, role)
      success('Asignación eliminada')
      await refreshSessionIfSelf()
      onRefresh()
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudo eliminar la asignación')
    } finally {
      setBusyKey(null)
      setRemoving(undefined)
    }
  }

  function projectLabel(projectId: string) {
    const p = projects[projectId]
    if (!p) return projectId
    return p.code ? `${p.code} · ${p.name}` : p.name
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-app-subtle">Asignaciones por proyecto</div>
          <p className="text-[11px] text-app-muted mt-0.5">Roles que esta persona desempeña en cada proyecto.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Asignar a proyecto
        </button>
      </div>

      {loadingProjects ? (
        <div className="flex items-center gap-2 text-xs text-app-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando proyectos...
        </div>
      ) : memberships.length === 0 ? (
        <div className="text-xs text-app-muted bg-app-bg border border-dashed border-app-border rounded-lg px-3 py-4 text-center">
          Aún no tiene asignaciones en ningún proyecto.
        </div>
      ) : (
        <ul className="divide-y divide-app-border bg-app-bg rounded-lg border border-app-border">
          {memberships.map((m) => {
            const key = `${m.project_id}:${m.role}`
            const isBusy = busyKey === key
            return (
              <li key={key} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-app-text truncate">{projectLabel(m.project_id)}</div>
                  <div className="text-[11px] uppercase tracking-wide text-app-subtle">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoving({ projectId: m.project_id, role: m.role })}
                  disabled={isBusy}
                  className="p-1.5 rounded-lg text-app-subtle hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                  title="Quitar asignación"
                  aria-label="Quitar asignación"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Asignar a proyecto">
        <AssignForm
          userId={user.id}
          projects={allProjects}
          existing={memberships}
          onCancel={() => setShowAssign(false)}
          onSaved={async () => {
            setShowAssign(false)
            success('Asignación creada')
            await refreshSessionIfSelf()
            onRefresh()
          }}
        />
      </Modal>

      <ConfirmModal
        open={!!removing}
        title="¿Quitar asignación?"
        message={
          removing
            ? `Vas a quitar el rol "${ROLE_LABEL[removing.role] ?? removing.role}" del proyecto "${projectLabel(removing.projectId)}". La persona perderá los permisos correspondientes en ese proyecto.`
            : ''
        }
        confirmLabel="Quitar"
        variant="danger"
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => {
          if (removing) void handleRemove(removing.projectId, removing.role)
        }}
      />
    </div>
  )
}

interface AssignFormProps {
  userId: string
  projects: ProjectLite[]
  existing: { project_id: string; role: ProjectRole }[]
  onCancel: () => void
  onSaved: () => void
}

function AssignForm({ userId, projects, existing, onCancel, onSaved }: AssignFormProps) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '')
  const [role, setRole] = useState<ProjectRole>('ingeniero_obra')
  const [saving, setSaving] = useState(false)
  const { error } = useToast()

  const existingKeys = useMemo(() => new Set(existing.map((m) => `${m.project_id}:${m.role}`)), [existing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!projectId) {
      error('Selecciona un proyecto')
      return
    }
    if (existingKeys.has(`${projectId}:${role}`)) {
      error('Esta asignación ya existe')
      return
    }
    setSaving(true)
    try {
      await adminService.assignProjectRole(userId, projectId, role)
      onSaved()
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudo asignar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelCls}>Proyecto *</label>
        <select className={inputCls} required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.length === 0 && <option value="">No hay proyectos disponibles</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} · ${p.name}` : p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Rol *</label>
        <select className={inputCls} required value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
          {PROJECT_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-app-subtle mt-1">
          Uno de los 8 roles del sistema. Las capacidades específicas se configuran en la matriz de roles.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-app-border rounded-lg text-app-muted hover:bg-app-hover"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || projects.length === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Asignando...' : 'Asignar'}
        </button>
      </div>
    </form>
  )
}
