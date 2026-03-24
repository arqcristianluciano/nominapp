import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, AlertCircle, X, CheckCircle } from 'lucide-react'
import { notificationService, type AppNotification } from '@/services/notificationService'

const LEVEL_STYLES: Record<string, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  danger:  { icon: AlertCircle,   bg: 'bg-red-50 dark:bg-red-950/40',    text: 'text-red-600 dark:text-red-400',    border: 'border-red-100 dark:border-red-900/50' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/40',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-100 dark:border-amber-900/50' },
  info:    { icon: Bell,          bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-100 dark:border-blue-900/50' },
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await notificationService.getAll()
      setNotifications(data)
    } catch {}
    finally { setLoading(false) }
  }

  function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDismissed((prev) => new Set([...prev, id]))
  }

  function handleClick(notif: AppNotification) {
    dismiss(notif.id, { stopPropagation: () => {} } as React.MouseEvent)
    setOpen(false)
    navigate(notif.link)
  }

  const visible = notifications.filter((n) => !dismissed.has(n.id))
  const dangerCount = visible.filter((n) => n.level === 'danger').length
  const badgeCount = visible.length

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-app-subtle hover:text-app-muted rounded-lg hover:bg-app-hover-strong transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className={`absolute top-1 right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white leading-none px-0.5 ${dangerCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-app-surface rounded-xl border border-app-border shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-app-text">Notificaciones</span>
              {badgeCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-app-chip text-app-muted">
                  {badgeCount}
                </span>
              )}
            </div>
            <button
              onClick={() => { setDismissed(new Set(notifications.map((n) => n.id))); setOpen(false) }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar todo
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-app-border">
            {loading && (
              <div className="px-4 py-6 text-sm text-center text-app-subtle">Cargando...</div>
            )}

            {!loading && visible.length === 0 && (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-app-muted">Todo en orden</p>
              </div>
            )}

            {visible.map((notif) => {
              const style = LEVEL_STYLES[notif.level]
              const Icon = style.icon
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-app-hover transition-colors ${style.border}`}
                >
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-app-text">{notif.title}</p>
                    <p className="text-xs text-app-muted truncate mt-0.5">{notif.description}</p>
                  </div>
                  <button
                    onClick={(e) => dismiss(notif.id, e)}
                    className="shrink-0 p-0.5 text-app-subtle hover:text-app-muted mt-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
