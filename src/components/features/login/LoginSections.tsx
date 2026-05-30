import { AlertTriangle, BarChart3, Building2, LogIn, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ENABLE_TEST_QUICK_LOGIN, TEST_USERS } from '@/constants/testUsers'
import { isDemoMode } from '@/lib/supabase'

export function LoginBrandPanel() {
  const { t } = useTranslation()
  const features = [
    { icon: BarChart3, text: t('login.feature_budget') },
    { icon: ShieldCheck, text: t('login.feature_approvals') },
    { icon: Building2, text: t('login.feature_multiproject') },
  ]
  return (
    <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 text-white">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">{t('nav.brand')}</span>
      </div>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold leading-snug">{t('login.brand_title')}</h1>
          <p className="mt-3 text-blue-200 text-sm leading-relaxed">{t('login.brand_subtitle')}</p>
        </div>
        <div className="space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-blue-100">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              {text}
            </div>
          ))}
        </div>
      </div>
      <p className="text-blue-300 text-xs">{t('login.footer')}</p>
    </div>
  )
}

export function LoginQuickAccess({
  onQuickLogin,
}: {
  onQuickLogin: (username: string, password: string) => Promise<void>
}) {
  const { t } = useTranslation()
  // En producción real (build production y backend real), el acceso rápido solo
  // aparece si está habilitado por env. En demo (mockSupabase) y dev sigue visible.
  if (!ENABLE_TEST_QUICK_LOGIN && !isDemoMode && import.meta.env.MODE === 'production') return null
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">{t('login.quick_access_title')}</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{t('login.quick_access_subtitle')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TEST_USERS.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => void onQuickLogin(u.email, u.password)}
            className="flex flex-col items-start justify-center min-h-[44px] py-2 px-2.5 rounded-lg bg-white dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors border border-amber-200 dark:border-amber-700"
          >
            <span className="text-xs font-semibold leading-tight">{u.displayName}</span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">{u.roleLabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function LoginFormPanel({
  hydrated,
  username,
  password,
  error,
  submitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onQuickLogin,
}: {
  hydrated: boolean
  username: string
  password: string
  error: string | null
  submitting: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onQuickLogin: (username: string, password: string) => Promise<void>
}) {
  const { t } = useTranslation()
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-app-text">{t('nav.brand')}</h1>
          </div>
          <div className="lg:block">
            <h2 className="text-2xl font-bold text-app-text">{t('login.welcome_title')}</h2>
            <p className="mt-1 text-sm text-app-muted">{t('login.welcome_subtitle')}</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-user"
                className="block text-xs font-semibold text-app-muted mb-1.5 uppercase tracking-wide"
              >
                {t('login.email_label')}
              </label>
              <input
                id="login-user"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-surface text-app-text text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                required
              />
            </div>
            <div>
              <label
                htmlFor="login-pass"
                className="block text-xs font-semibold text-app-muted mb-1.5 uppercase tracking-wide"
              >
                {t('login.password_label')}
              </label>
              <input
                id="login-pass"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-surface text-app-text text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-300" role="alert">
                  {error}
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !hydrated}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm shadow-blue-600/20"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
          <LoginQuickAccess onQuickLogin={onQuickLogin} />
        </div>
      </div>
    </div>
  )
}
