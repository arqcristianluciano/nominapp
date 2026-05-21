import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import '@/i18n'
import App from './App'
import { SentryErrorBoundary } from '@/components/SentryErrorBoundary'
import { useThemeStore, syncThemeFromStore } from '@/stores/themeStore'

// Inicializar Sentry sólo cuando el DSN esté definido en el entorno.
// Esto mantiene el desarrollo local silencioso si no se configura el DSN.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    release: import.meta.env.VITE_SENTRY_RELEASE || 'dev',
    environment: import.meta.env.MODE,
  })
}

useThemeStore.persist.onFinishHydration(() => {
  syncThemeFromStore()
})
if (useThemeStore.persist.hasHydrated()) {
  syncThemeFromStore()
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* SW registration is optional */})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary>
      <App />
    </SentryErrorBoundary>
  </StrictMode>,
)
