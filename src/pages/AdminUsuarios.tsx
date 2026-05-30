import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, ShieldCheck, ListChecks } from 'lucide-react'
import { AdminUsuariosPersonas } from '@/components/features/admin/AdminUsuariosPersonas'
import { AdminUsuariosMatriz } from '@/components/features/admin/AdminUsuariosMatriz'
import { AdminUsuariosRoles } from '@/components/features/admin/AdminUsuariosRoles'

type Tab = 'personas' | 'matriz' | 'roles'

const TAB_DEFS: { value: Tab; labelKey: string; icon: typeof Users }[] = [
  { value: 'personas', labelKey: 'admin.tabs.personas', icon: Users },
  { value: 'matriz', labelKey: 'admin.tabs.matriz', icon: ListChecks },
  { value: 'roles', labelKey: 'admin.tabs.roles', icon: ShieldCheck },
]

export default function AdminUsuarios() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('personas')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">{t('admin.title')}</h1>
        <p className="text-sm text-app-muted mt-1">{t('admin.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-app-border">
        {TAB_DEFS.map((td) => {
          const Icon = td.icon
          const active = tab === td.value
          return (
            <button
              key={td.value}
              onClick={() => setTab(td.value)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <Icon className="w-4 h-4" /> {t(td.labelKey)}
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
