import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, AlertCircle, X, CheckCircle, Mail, MessageCircle, Share2 } from 'lucide-react'
import { notificationService, type AppNotification } from '@/services/notificationService'

// ---------------------------------------------------------------------------
// Helpers para compartir sin backend ni credenciales
// ---------------------------------------------------------------------------

/** Arma el texto de un aviso individual. */
function notifToText(notif: AppNotification): string {
  const levelLabel = notif.level === 'danger' ? '🔴' : notif.level === 'warning' ? '🟡' : 'ℹ️'
  return `${levelLabel} *${notif.title}*\n${notif.description}`
}

/** Arma un resumen de todos los avisos visibles. */
function summaryText(notifications: AppNotification[]): string {
  const lines = notifications.map((n, i) => `${i + 1}. ${notifToText(n)}`).join('\n\n')
  return `*Resumen de alertas NominApp* (${notifications.length} aviso${notifications.length !== 1 ? 's' : ''})\n\n${lines}`
}

/** Abre WhatsApp Web/app con el mensaje listo. El usuario elige a quién enviárselo. */
function openWhatsApp(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
}

/** Abre el cliente de correo con asunto y cuerpo prellenados. */
function openEmail(subject: string, body: string): void {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---------------------------------------------------------------------------

const LEVEL_STYLES: Record<string, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  danger: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-900/50',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
  info: {
    icon: Bell,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900/50',
  },
}
const ICON_BUTTON_CLASS =
  'rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface disabled:cursor-not-allowed disabled:opacity-50'
const TEXT_BUTTON_CLASS =
  'font-medium text-blue-600 hover:text-blue-800 disabled:text-app-subtle disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface'

export function NotificationDropdown() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setError(null)
    try {
      const data = await notificationService.getAll()
      setNotifications(data)
    } catch (err) {
      console.error('NotificationDropdown load failed', err)
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`No se pudieron cargar las notificaciones: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  function markAllAsRead() {
    setDismissed(new Set(notifications.map((n) => n.id)))
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

  function handleShareWhatsApp(notif: AppNotification, e: React.MouseEvent) {
    e.stopPropagation()
    openWhatsApp(notifToText(notif))
  }

  function handleShareEmail(notif: AppNotification, e: React.MouseEvent) {
    e.stopPropagation()
    openEmail(notif.title, notifToText(notif))
  }

  function handleShareSummaryWhatsApp() {
    openWhatsApp(summaryText(visible))
  }

  function handleShareSummaryEmail() {
    openEmail('Resumen de alertas NominApp', summaryText(visible))
  }

  const visible = notifications.filter((n) => !dismissed.has(n.id))
  const dangerCount = visible.filter((n) => n.level === 'danger').length
  const badgeCount = visible.length

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 text-app-subtle hover:text-app-muted hover:bg-app-hover-strong ${ICON_BUTTON_CLASS}`}
        title="Notificaciones"
        aria-label={
          badgeCount > 0
            ? `Notificaciones (${badgeCount} sin leer). ${open ? 'Cerrar' : 'Abrir'} panel`
            : `Notificaciones (sin alertas). ${open ? 'Cerrar' : 'Abrir'} panel`
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {badgeCount > 0 && (
          <span
            className={`absolute top-1 right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white leading-none px-0.5 ${dangerCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}
          >
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
              type="button"
              onClick={markAllAsRead}
              className={`text-xs ${TEXT_BUTTON_CLASS}`}
              disabled={badgeCount === 0}
              aria-label="Marcar todas las notificaciones como leídas"
            >
              Marcar todas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-app-border">
            {loading && (
              <div className="px-4 py-6 text-sm text-center text-app-subtle" role="status" aria-live="polite">
                Cargando notificaciones...
              </div>
            )}

            {!loading && error && (
              <div className="px-4 py-6 text-center" role="alert" aria-live="assertive">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Error al cargar notificaciones</p>
                <p className="text-xs text-app-muted mt-1 break-words">{error}</p>
                <button type="button" onClick={load} className={`mt-3 text-xs ${TEXT_BUTTON_CLASS}`}>
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-app-text">Todo en orden</p>
                <p className="text-xs text-app-muted mt-1">No tienes alertas pendientes por ahora.</p>
              </div>
            )}

            {!error &&
              visible.map((notif) => {
                const style = LEVEL_STYLES[notif.level]
                const Icon = style.icon
                return (
                  <div key={notif.id} className={`flex flex-col ${style.border}`}>
                    {/* Fila principal: icono + texto + descartar */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleClick(notif)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleClick(notif)
                        }
                      }}
                      className="w-full cursor-pointer text-left flex items-start gap-3 px-4 pt-3 pb-1 hover:bg-app-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    >
                      <div
                        className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${style.text}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-app-text">{notif.title}</p>
                        <p className="text-xs text-app-muted truncate mt-0.5">{notif.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => dismiss(notif.id, e)}
                        className={`shrink-0 p-0.5 mt-0.5 text-app-subtle hover:text-app-muted ${ICON_BUTTON_CLASS}`}
                        title="Descartar notificación"
                        aria-label="Descartar notificación"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Fila de acciones: enviar por WhatsApp / correo */}
                    <div className="flex items-center gap-2 px-4 pb-2 pl-14">
                      <button
                        type="button"
                        onClick={(e) => handleShareWhatsApp(notif, e)}
                        className={`flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium ${ICON_BUTTON_CLASS}`}
                        title="Enviar por WhatsApp"
                        aria-label={`Enviar aviso "${notif.title}" por WhatsApp`}
                      >
                        <MessageCircle className="w-3 h-3" aria-hidden="true" />
                        WhatsApp
                      </button>
                      <span className="text-app-subtle text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={(e) => handleShareEmail(notif, e)}
                        className={`flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium ${ICON_BUTTON_CLASS}`}
                        title="Enviar por correo"
                        aria-label={`Enviar aviso "${notif.title}" por correo`}
                      >
                        <Mail className="w-3 h-3" aria-hidden="true" />
                        Correo
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Pie: compartir resumen de todos los avisos visibles */}
          {!loading && !error && visible.length > 1 && (
            <div className="px-4 py-2.5 border-t border-app-border bg-app-surface-subtle flex items-center justify-between">
              <span className="text-[10px] text-app-subtle flex items-center gap-1">
                <Share2 className="w-3 h-3" aria-hidden="true" />
                Compartir resumen ({visible.length} avisos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareSummaryWhatsApp}
                  className={`flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium ${ICON_BUTTON_CLASS}`}
                  title="Compartir resumen por WhatsApp"
                  aria-label="Compartir resumen de todos los avisos por WhatsApp"
                >
                  <MessageCircle className="w-3 h-3" aria-hidden="true" />
                  WhatsApp
                </button>
                <span className="text-app-subtle text-[10px]">·</span>
                <button
                  type="button"
                  onClick={handleShareSummaryEmail}
                  className={`flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium ${ICON_BUTTON_CLASS}`}
                  title="Compartir resumen por correo"
                  aria-label="Compartir resumen de todos los avisos por correo"
                >
                  <Mail className="w-3 h-3" aria-hidden="true" />
                  Correo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
