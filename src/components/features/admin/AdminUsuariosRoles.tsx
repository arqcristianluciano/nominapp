import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, ShieldCheck, Search } from 'lucide-react'
import { adminService, type Role } from '@/services/adminService'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { supabase } from '@/lib/supabase'

const input =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'text-xs font-medium text-app-muted mb-1 block'

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function AdminUsuariosRoles() {
  const { t } = useTranslation()
  const [roles, setRoles] = useState<Role[]>([])
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Role | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Role | undefined>()
  const [search, setSearch] = useState('')
  const { error, success } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesData, membersRes] = await Promise.all([
        adminService.listRoles(),
        supabase.from('project_members').select('role'),
      ])
      setRoles(rolesData)
      if (membersRes.error) {
        // No bloqueamos la UI si falla el conteo, solo mostramos 0.
        setRoleCounts({})
      } else {
        const counts: Record<string, number> = {}
        for (const row of (membersRes.data ?? []) as { role: string | null }[]) {
          if (!row.role) continue
          counts[row.role] = (counts[row.role] ?? 0) + 1
        }
        setRoleCounts(counts)
      }
    } catch (err) {
      error(err instanceof Error ? err.message : t('admin.roles.load_failed'))
    } finally {
      setLoading(false)
    }
  }, [error, t])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    )
  }, [search, roles])

  async function handleDelete(role: Role) {
    try {
      await adminService.deleteRole(role.id)
      success(t('admin.roles.deleted', { name: role.name }))
      setConfirmDelete(undefined)
      await load()
    } catch (err) {
      error(err instanceof Error ? err.message : t('admin.roles.delete_failed'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-app-muted">{t('admin.roles.intro')}</p>
        <button
          onClick={() => {
            setEditing(undefined)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('admin.roles.new_role')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.roles.search_placeholder')}
          className="w-full pl-9 pr-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">{t('admin.roles.loading')}</div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-sm text-app-muted py-6 text-center">
          {search.trim() ? t('admin.roles.no_match', { query: search.trim() }) : t('admin.roles.no_roles')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRoles.map((r) => {
            const count = roleCounts[r.slug] ?? 0
            return (
              <div key={r.id} className="bg-app-surface rounded-xl border border-app-border p-4 flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    r.is_director
                      ? 'bg-amber-100 text-amber-600'
                      : r.is_system
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-app-text truncate">{r.name}</span>
                    <span
                      className="text-[11px] text-app-subtle font-medium whitespace-nowrap"
                      title={t('admin.roles.users_with_role', { count })}
                    >
                      ({count} {count === 1 ? t('admin.roles.user_one') : t('admin.roles.user_other')})
                    </span>
                    {r.is_director && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 font-semibold uppercase tracking-wide">
                        {t('admin.roles.director_badge')}
                      </span>
                    )}
                    {r.is_system && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-app-chip text-app-subtle font-semibold uppercase tracking-wide">
                        {t('admin.roles.system_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-app-muted mt-0.5">{r.description ?? '—'}</p>
                  <p className="text-[10px] uppercase tracking-wide text-app-subtle mt-1">{r.slug}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEditing(r)
                      setShowForm(true)
                    }}
                    className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    title={t('admin.roles.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!r.is_system && (
                    <button
                      onClick={() => setConfirmDelete(r)}
                      className="p-1.5 rounded-lg text-app-subtle hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title={t('admin.roles.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? t('admin.roles.modal_edit') : t('admin.roles.modal_new')}
      >
        <RoleForm
          initial={editing}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            success(editing ? t('admin.roles.saved_updated') : t('admin.roles.saved_created'))
            await load()
          }}
        />
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title={t('admin.roles.confirm_delete_title')}
        message={
          confirmDelete
            ? (roleCounts[confirmDelete.slug] ?? 0) > 0
              ? t('admin.roles.confirm_delete_with_users', {
                  name: confirmDelete.name,
                  count: roleCounts[confirmDelete.slug],
                })
              : t('admin.roles.confirm_delete_no_users', { name: confirmDelete.name })
            : ''
        }
        confirmLabel={t('admin.roles.delete')}
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) void handleDelete(confirmDelete)
        }}
        onCancel={() => setConfirmDelete(undefined)}
      />
    </div>
  )
}

function RoleForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Role
  onCancel: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const { error } = useToast()

  const isEdit = !!initial

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      if (isEdit) {
        await adminService.updateRole(initial!.id, { name: name.trim(), description: description.trim() || null })
      } else {
        if (!name.trim() || !slug.trim()) {
          error(t('admin.roles.form.name_slug_required'))
          setSaving(false)
          return
        }
        await adminService.createRole({
          slug: slug.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        })
      }
      await onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.roles.form.save_failed')
      error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={label}>{t('admin.roles.form.name')} *</label>
        <input
          className={input}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!isEdit && !slugTouched) setSlug(slugify(e.target.value))
          }}
          placeholder={t('admin.roles.form.name_placeholder')}
        />
      </div>
      <div>
        <label className={label}>{t('admin.roles.form.slug')} *</label>
        <input
          className={input}
          required
          disabled={isEdit && initial?.is_system}
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value))
            setSlugTouched(true)
          }}
          placeholder={t('admin.roles.form.slug_placeholder')}
        />
        <p className="text-[11px] text-app-subtle mt-1">{t('admin.roles.form.slug_hint')}</p>
      </div>
      <div>
        <label className={label}>{t('admin.roles.form.description')}</label>
        <textarea
          className={input}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('admin.roles.form.description_placeholder')}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-app-border rounded-lg text-app-muted hover:bg-app-hover"
        >
          {t('admin.roles.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? t('admin.roles.form.saving') : isEdit ? t('admin.roles.form.save') : t('admin.roles.form.create')}
        </button>
      </div>
    </form>
  )
}
