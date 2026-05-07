import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { clearChunkReloadFlag, isChunkLoadError } from '@/utils/lazyWithRetry'

const RELOAD_KEY = 'obrapro:chunk-reload-attempt'

function alreadyReloaded(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_KEY) === '1'
  } catch {
    return false
  }
}

function markReloaded(): void {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    // ignore
  }
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Error desconocido'
}

export default function RouterErrorBoundary() {
  const error = useRouteError()
  const isStale = isChunkLoadError(error)

  useEffect(() => {
    if (isStale && !alreadyReloaded()) {
      markReloaded()
      window.location.reload()
    }
  }, [isStale])

  const handleReload = () => {
    clearChunkReloadFlag()
    window.location.reload()
  }

  if (isStale) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/60 mb-6">
            <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-black text-app-text mb-2">Actualizando aplicación</h1>
          <p className="text-sm text-app-muted mb-6">
            Detectamos una nueva versión publicada. Recargando...
          </p>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar ahora
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-app-text mb-2">Algo salió mal</h1>
        <p className="text-sm text-app-muted mb-6 break-words font-mono">
          {getMessage(error)}
        </p>
        <button
          onClick={handleReload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Recargar
        </button>
      </div>
    </div>
  )
}
