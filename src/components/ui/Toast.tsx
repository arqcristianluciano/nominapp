import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-blue-600 text-white',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-4), { id, type, message }])
    const timer = setTimeout(() => dismiss(id), 3500)
    timers.current.set(id, timer)
  }, [dismiss])

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast])
  const error   = useCallback((msg: string) => addToast(msg, 'error'), [addToast])
  const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast])
  const info    = useCallback((msg: string) => addToast(msg, 'info'), [addToast])

  const ctx = useMemo<ToastContextValue>(
    () => ({
      toast: addToast,
      success,
      error,
      warning,
      info,
    }),
    [addToast, success, error, warning, info],
  )

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          const isAssertive = t.type === 'error' || t.type === 'warning'
          return (
            <div
              key={t.id}
              role={isAssertive ? 'alert' : 'status'}
              aria-live={isAssertive ? 'assertive' : 'polite'}
              aria-atomic="true"
              className={`flex items-center gap-3 pl-3.5 pr-2 py-3 rounded-xl shadow-lg min-w-[260px] max-w-xs pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200 ${STYLES[t.type]}`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar notificación"
                className="p-1 rounded-lg hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
