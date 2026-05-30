import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

/**
 * Avisa cuando hay una nueva versión del service worker lista y ofrece recargar
 * para aplicarla. Se apoya en el handler `SKIP_WAITING` que ya implementa sw.js.
 */
export default function UpdatePrompt() {
  const [visible, setVisible] = useState(false)
  const reloadingRef = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      if (reloadingRef.current) return
      reloadingRef.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker.ready
      .then((reg) => {
        // Ya hay una versión esperando (cargó la página con un SW pendiente).
        if (reg.waiting && navigator.serviceWorker.controller) setVisible(true)

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // 'installed' + controlador presente = actualización (no primera instalación).
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setVisible(true)
            }
          })
        })
      })
      .catch(() => {
        /* SW no disponible */
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!visible) return null

  const applyUpdate = () => {
    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        // El SW llamará a skipWaiting → dispara controllerchange → recarga.
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      } else {
        if (reloadingRef.current) return
        reloadingRef.current = true
        window.location.reload()
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Nueva versión disponible"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] sm:px-6 lg:pb-6"
    >
      <div className="mx-auto max-w-md rounded-xl bg-app-surface shadow-lg ring-1 ring-black/10 dark:ring-white/10">
        <div className="flex items-center gap-3 p-3.5">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-app-text">Nueva versión disponible</p>
            <p className="text-xs text-app-muted mt-0.5">Recarga para aplicar la actualización.</p>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.97] transition-all shrink-0"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Cerrar aviso de actualización"
            title="Cerrar"
            className="p-1.5 rounded-lg text-app-subtle hover:text-app-text hover:bg-app-hover transition-colors shrink-0 flex items-center justify-center [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
