import type { ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface SentryErrorBoundaryProps {
  children: ReactNode
}

/**
 * Envoltorio sobre `Sentry.ErrorBoundary` con un fallback amigable en español.
 * Captura errores de renderizado del árbol de React y los reporta a Sentry
 * cuando la integración está activa.
 */
export function SentryErrorBoundary({ children }: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: '32rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>Algo salió mal</h1>
            <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>Algo salió mal. Hemos sido notificados.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                cursor: 'pointer',
              }}
            >
              Recargar la página
            </button>
          </div>
        </div>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}

export default SentryErrorBoundary
