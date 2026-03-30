import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Building2, BarChart3, ShieldCheck, FlaskConical } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { DEMO_USERS } from '@/constants/demoUsers'

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
    return () => { done?.() }
  }, [hydrated])

  if (hydrated && user) return <Navigate to={from} replace />

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

  function fillDemo(u: typeof DEMO_USERS[number]) {
    setUsername(u.username)
    setPassword(u.password)
    setError(null)
  }

  return (
    <div className="min-h-screen flex bg-app-bg">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">NominaAPP</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold leading-snug">
              Gestión financiera para proyectos de construcción
            </h1>
            <p className="mt-3 text-blue-200 text-sm leading-relaxed">
              Control de nóminas, presupuesto, cubicaciones y cuentas por pagar en un solo lugar.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: BarChart3, text: 'Presupuesto vs. real en tiempo real' },
              { icon: ShieldCheck, text: 'Aprobaciones con firma digital' },
              { icon: Building2, text: 'Multi-proyecto con control financiero' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs">© 2026 NominaAPP · v0.4.0</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-6">
            {/* Mobile logo */}
            <div className="flex flex-col items-center gap-2 lg:hidden">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-app-text">NominaAPP</h1>
            </div>

            <div className="lg:block">
              <h2 className="text-2xl font-bold text-app-text">Bienvenido</h2>
              <p className="mt-1 text-sm text-app-muted">Inicia sesión para acceder a tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-user" className="block text-xs font-semibold text-app-muted mb-1.5 uppercase tracking-wide">
                  Usuario
                </label>
                <input
                  id="login-user"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-surface text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-pass" className="block text-xs font-semibold text-app-muted mb-1.5 uppercase tracking-wide">
                  Contraseña
                </label>
                <input
                  id="login-pass"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-surface text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-300" role="alert">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !hydrated}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm shadow-blue-600/20"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? 'Entrando…' : 'Iniciar sesión'}
              </button>
            </form>

            {/* Demo hint */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Modo Demo — usuarios de prueba</span>
              </div>
              <div className="flex gap-2">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => fillDemo(u)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors border border-amber-200 dark:border-amber-700"
                  >
                    {u.displayName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
