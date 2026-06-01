import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuthStore } from '@/stores/authStore'
import { LoginBrandPanel, LoginFormPanel } from '@/components/features/login/LoginSections'

// El bloque de quick-access (botones de "entrar como <rol>") se muestra siempre,
// también en la app publicada: el dueño lo quiere visible para todos para entrar
// con un clic, como estaba antes. La app sigue en fase de pruebas.

// Heuristica para distinguir "credenciales malas" (login devolvió false) vs
// "no pudimos contactar al backend" (excepción de red / fetch). authService
// captura su propio error y devuelve null en credenciales malas; cualquier
// throw que llegue aquí es inesperado y muy probablemente conectividad.
function describeLoginError(err: unknown, t: TFunction): string {
  if (err instanceof TypeError) {
    // fetch falla con TypeError ("Failed to fetch", "Load failed", "NetworkError…")
    return t('login.errors.network')
  }
  const message = err instanceof Error ? err.message.toLowerCase() : ''
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return t('login.errors.network')
  }
  return t('login.errors.generic')
}

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hydrated) return
    const done = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return () => {
      done?.()
    }
  }, [hydrated])

  if (hydrated && user) return <Navigate to={from} replace />

  async function performLogin(u: string, p: string) {
    setError(null)
    setSubmitting(true)
    try {
      const ok = await login(u, p)
      if (!ok) {
        setError(t('login.errors.invalid_credentials'))
        setSubmitting(false)
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(describeLoginError(err, t))
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await performLogin(username, password)
  }

  async function quickLogin(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    await performLogin(u, p)
  }

  return (
    <div style={{ paddingTop: 'env(safe-area-inset-top)' }} className="min-h-screen flex flex-col bg-app-bg">
      <div
        role="status"
        className="w-full px-4 py-2 text-center text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700"
      >
        {t('login.demo_banner')}
      </div>
      <div className="flex-1 flex">
        <LoginBrandPanel />
        <LoginFormPanel
          hydrated={hydrated}
          username={username}
          password={password}
          error={error}
          submitting={submitting}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onQuickLogin={quickLogin}
        />
      </div>
    </div>
  )
}
