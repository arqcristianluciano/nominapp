import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuthStore } from '@/stores/authStore'
import { isDemoMode } from '@/lib/supabase'
import { ENABLE_TEST_QUICK_LOGIN } from '@/constants/testUsers'
import { LoginBrandPanel, LoginFormPanel } from '@/components/features/login/LoginSections'

// El bloque de quick-access (cuentas provisionales) se muestra en demo, en build
// de desarrollo, o cuando ENABLE_TEST_QUICK_LOGIN está activo (fase de pruebas en
// producción). En producción real, con el flag en false, lo neutralizamos:
// ocultamos la sección vía CSS (sin tocar LoginSections) y dejamos el callback no-op.
const showQuickAccess = ENABLE_TEST_QUICK_LOGIN || isDemoMode || import.meta.env.MODE === 'development'

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
    if (!showQuickAccess) return
    setUsername(u)
    setPassword(p)
    await performLogin(u, p)
  }

  return (
    <div className={`min-h-screen flex flex-col bg-app-bg${showQuickAccess ? '' : ' login--hide-quick-access'}`}>
      {/* En prod ocultamos el bloque de quick-access (renderizado dentro de LoginFormPanel)
          mediante una clase a nivel raíz, sin tocar LoginSections. Reemplaza el badge
          de "cuentas provisionales" del LoginQuickAccess por un hint visible solo en demo/dev. */}
      {!showQuickAccess && (
        <style>{`.login--hide-quick-access .grid.grid-cols-1.sm\\:grid-cols-2.gap-2,
.login--hide-quick-access .rounded-xl.border.border-amber-300{display:none !important}`}</style>
      )}
      {showQuickAccess && (
        <div
          role="status"
          className="w-full px-4 py-2 text-center text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700"
        >
          {t('login.demo_banner')}
        </div>
      )}
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
