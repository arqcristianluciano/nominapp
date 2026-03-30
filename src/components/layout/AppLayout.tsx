import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { isDemoMode } from '@/lib/supabase'
import { FlaskConical, X } from 'lucide-react'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [demoDismissed, setDemoDismissed] = useState(false)

  return (
    <div className="flex h-screen bg-app-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {isDemoMode && !demoDismissed && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Modo Demo</strong> — datos de ejemplo en memoria. Configura{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env</code>{' '}
                con credenciales de Supabase para la base de datos real.
              </span>
            </div>
            <button
              onClick={() => setDemoDismissed(true)}
              className="p-1 rounded text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
