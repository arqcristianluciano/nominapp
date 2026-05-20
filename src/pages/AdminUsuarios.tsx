import { useState } from 'react'
import { Users, ShieldCheck, ListChecks } from 'lucide-react'
import { AdminUsuariosPersonas } from '@/components/features/admin/AdminUsuariosPersonas'
import { AdminUsuariosMatriz } from '@/components/features/admin/AdminUsuariosMatriz'
import { AdminUsuariosRoles } from '@/components/features/admin/AdminUsuariosRoles'

type Tab = 'personas' | 'matriz' | 'roles'

const TABS: { value: Tab; label: string; icon: typeof Users }[] = [
  { value: 'personas', label: 'Personas',           icon: Users },
  { value: 'matriz',   label: 'Matriz de permisos', icon: ListChecks },
  { value: 'roles',    label: 'Roles',              icon: ShieldCheck },
]

export default function AdminUsuarios() {
  const [tab, setTab] = useState<Tab>('personas')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Administración de usuarios</h1>
        <p className="text-sm text-app-muted mt-1">Personas, roles y permisos del sistema.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-app-border">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'personas' && <AdminUsuariosPersonas />}
      {tab === 'matriz' && <AdminUsuariosMatriz />}
      {tab === 'roles' && <AdminUsuariosRoles />}
    </div>
  )
}
