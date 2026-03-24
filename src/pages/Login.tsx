import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export default function Login() {
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

  if (hydrated && user) {
    return <Navigate to={from} replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const ok = login(username, password)
      if (!ok) {
        setError('Usuario o contraseña incorrectos.')
        setSubmitting(false)
        return
      }
      navigate(from, { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-app-bg">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-xl border border-app-border bg-app-surface p-8 shadow-sm">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold">
              N
            </div>
            <h1 className="text-xl font-semibold text-app-text">NominaAPP</h1>
            <p className="text-sm text-app-muted text-center">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-user" className="block text-xs font-medium text-app-muted mb-1">
                Usuario
              </label>
              <input
                id="login-user"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-xs font-medium text-app-muted mb-1">
                Contraseña
              </label>
              <input
                id="login-pass"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !hydrated}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
