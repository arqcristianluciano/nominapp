import { useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { isDemoMode } from '@/lib/supabase'
import { FlaskConical, RefreshCw, WifiOff, X } from 'lucide-react'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [demoDismissed, setDemoDismissed] = useState(false)
  const { online, pendingCount, flushNow } = useOfflineQueue()
  const mainRef = useRef<HTMLElement>(null)
  const { pull, refreshing, threshold } = usePullToRefresh(mainRef, () => window.location.reload())

  return (
    <div className="flex h-screen h-[100dvh] bg-app-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {isDemoMode && !demoDismissed && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Modo Demo</strong> — datos de ejemplo en memoria. Configura{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env</code> con credenciales
                de Supabase para la base de datos real.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDemoDismissed(true)}
              className="p-1 rounded text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0 flex items-center justify-center [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-offset-amber-950/30"
              title="Cerrar aviso de modo demo"
              aria-label="Cerrar aviso de modo demo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {(!online || pendingCount > 0) && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 text-white text-xs shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              {!online ? (
                <span>
                  <strong>Sin conexión.</strong> Las solicitudes y avances se guardan localmente y se sincronizan cuando
                  vuelva la red.
                </span>
              ) : (
                <span>
                  <strong>{pendingCount}</strong> {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'} de
                  sincronizar.
                </span>
              )}
            </div>
            {online && pendingCount > 0 && (
              <button onClick={() => void flushNow()} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">
                Sincronizar
              </button>
            )}
          </div>
        )}

        <main ref={mainRef} className="relative flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {(pull > 0 || refreshing) && (
            <div
              className="lg:hidden pointer-events-none absolute left-1/2 top-1 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-app-surface border border-app-border shadow-sm"
              style={{
                transform: `translate(-50%, ${Math.max(0, pull - 8)}px)`,
                opacity: Math.min(1, pull / threshold),
              }}
            >
              <RefreshCw
                className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${refreshing ? 'animate-spin' : ''}`}
                style={refreshing ? undefined : { transform: `rotate(${(pull / threshold) * 270}deg)` }}
              />
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  )
}
