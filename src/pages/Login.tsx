import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginBrandPanel, LoginFormPanel } from '@/components/features/login/LoginSections'

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

  async function performLogin(u: string, p: string) {
    setError(null)
    setSubmitting(true)
    try {
      const ok = await login(u, p)
      if (!ok) {
        setError('Usuario o contraseña incorrectos.')
        setSubmitting(false)
        return
      }
      navigate(from, { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
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
    <div className="min-h-screen flex bg-app-bg">
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
  )
}
