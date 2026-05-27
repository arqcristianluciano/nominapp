import * as Sentry from '@sentry/react'

declare const __APP_VERSION__: string | undefined

/**
 * Versión de la app usada para etiquetar eventos en Sentry. Si el bundler no
 * inyecta `__APP_VERSION__`, se usa el fallback hardcodeado.
 */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '0.5.0'

/**
 * Inicializa Sentry si el DSN está definido en el entorno. Devuelve `true`
 * cuando Sentry quedó activo. Mantiene silencioso el desarrollo local.
 */
export function initSentry(): boolean {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  if (!sentryDsn) return false

  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    release: import.meta.env.VITE_SENTRY_RELEASE || 'dev',
    environment: import.meta.env.MODE,
  })

  Sentry.setTag('app.version', APP_VERSION)
  return true
}

/**
 * Indica si Sentry quedó inicializado (es decir, si había un DSN configurado).
 * Útil para mostrar diagnósticos en la UI sin exponer el DSN.
 */
export function isSentryActive(): boolean {
  return Boolean(Sentry.getClient())
}

/**
 * Envía un evento de error de prueba a Sentry para verificar el flujo completo
 * (captura → proyecto → alerta por correo). Cada invocación usa un fingerprint
 * único para que Sentry lo trate como un issue nuevo y dispare la alerta de
 * "nuevo issue". Devuelve el id del evento, o `undefined` si Sentry no está
 * activo (falta `VITE_SENTRY_DSN`).
 */
export function sendTestEvent(): string | undefined {
  if (!isSentryActive()) return undefined
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return Sentry.withScope((scope) => {
    scope.setFingerprint(['sentry-test', token])
    scope.setTag('test_event', 'true')
    return Sentry.captureException(new Error(`Sentry test error · ${token}`))
  })
}

/**
 * Helper para registrar breadcrumbs sin tener que importar el SDK completo
 * en cada servicio. Es seguro de invocar aún si Sentry no fue inicializado:
 * en ese caso, las breadcrumbs simplemente quedan en buffer y se descartan.
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  })
}
