import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Building2, ScrollText, BarChart3, Menu } from 'lucide-react'

interface BottomNavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  end?: boolean
}

const ITEMS: BottomNavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/proyectos', icon: Building2, labelKey: 'nav.projects' },
  { to: '/nominas', icon: ScrollText, labelKey: 'nav.payrollReports' },
  { to: '/presupuesto', icon: BarChart3, labelKey: 'nav.budget' },
]

interface BottomNavProps {
  onMenuClick: () => void
}

/**
 * Barra de navegación inferior, sólo en móvil (oculta en `lg`).
 * Coloca los destinos principales al alcance del pulgar y respeta el
 * safe-area inferior del iPhone. El botón "Más" abre el sidebar completo.
 */
export function BottomNav({ onMenuClick }: BottomNavProps) {
  const { t } = useTranslation()

  const linkClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] text-[10px] font-medium transition-colors ${
      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-app-subtle hover:text-app-muted'
    }`

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-app-surface/95 backdrop-blur border-t border-app-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('nav.brand')}
    >
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkClass(isActive)}>
          {({ isActive }) => (
            <>
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className="truncate max-w-full px-1">{t(item.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] text-[10px] font-medium text-app-subtle hover:text-app-muted transition-colors"
        aria-label={t('nav.openMenuAria')}
      >
        <Menu className="w-5 h-5" />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  )
}
