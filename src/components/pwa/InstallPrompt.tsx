import { useEffect, useState } from 'react'

// Type for the beforeinstallprompt event (not in lib.dom.d.ts by default)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const DISMISS_KEY = 'pwa-prompt-dismissed-at'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return Date.now() - ts < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIosDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac, detect via touch
  const isIpadOs =
    ua.includes('Macintosh') && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1
  return isIosDevice || isIpadOs
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mql = window.matchMedia?.('(display-mode: standalone)')
  if (mql?.matches) return true
  // iOS Safari uses navigator.standalone
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (wasRecentlyDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari fallback (no beforeinstallprompt support)
    if (isIos()) {
      setShowIosHint(true)
      setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
      }
    } catch {
      // ignore
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignore storage errors
    }
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Instalar NominApp"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-md rounded-xl bg-white shadow-lg ring-1 ring-black/10 dark:bg-slate-800 dark:ring-white/10">
        <div className="p-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Instala NominApp en tu pantalla de inicio
          </p>
          {showIosHint ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tocar Compartir &gt; Anadir a Pantalla de Inicio
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Accede mas rapido y trabaja sin conexion.</p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Ahora no
            </button>
            {!showIosHint && (
              <button
                type="button"
                onClick={handleInstall}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Instalar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
