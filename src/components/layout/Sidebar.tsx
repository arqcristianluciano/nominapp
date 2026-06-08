import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  HardHat,
  Truck,
  Settings,
  X,
  Landmark,
  BarChart3,
  FileText,
  CreditCard,
  ShoppingCart,
  ScrollText,
  Banknote,
  Layers,
  ChevronRight,
  Calendar,
  TrendingUp,
  Users,
  CalendarCheck,
} from 'lucide-react'
import { usePendingApprovals } from '@/hooks/usePendingApprovals'
import { usePendingCortes } from '@/hooks/usePendingCortes'
import { useAppRoles, type UseAppRolesResult } from '@/hooks/useAppRoles'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

type CapabilityKey = {
  [K in keyof UseAppRolesResult]: UseAppRolesResult[K] extends boolean ? K : never
}[keyof UseAppRolesResult]

interface NavItem {
  to: string
  icon: React.ElementType
  labelKey: string
  badgeKey?: 'approvals' | 'cortes'
  capability?: CapabilityKey
}

interface NavSection {
  labelKey: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'nav.sections.general',
    items: [
      { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { to: '/proyectos', icon: Building2, labelKey: 'nav.projects' },
      { to: '/nominas', icon: ScrollText, labelKey: 'nav.payrollReports' },
    ],
  },
  {
    labelKey: 'nav.sections.finanzas',
    items: [
      { to: '/finanzas', icon: Landmark, labelKey: 'nav.finance', capability: 'canViewFinanzas' },
      { to: '/presupuesto', icon: BarChart3, labelKey: 'nav.budget' },
      { to: '/cxp', icon: CreditCard, labelKey: 'nav.accountsPayable', capability: 'canViewFinanzas' },
      { to: '/cubicaciones', icon: Layers, labelKey: 'nav.cubicaciones', badgeKey: 'cortes' as const },
    ],
  },
  {
    labelKey: 'nav.sections.compras',
    items: [{ to: '/ordenes-compra', icon: ShoppingCart, labelKey: 'nav.purchaseOrders' }],
  },
  {
    labelKey: 'nav.sections.recursos',
    items: [
      { to: '/contratistas', icon: HardHat, labelKey: 'nav.contractors' },
      { to: '/suplidores', icon: Truck, labelKey: 'nav.suppliers' },
      { to: '/prestamos', icon: Banknote, labelKey: 'nav.loans', capability: 'canWriteLoans' },
    ],
  },
  {
    labelKey: 'nav.sections.planificacion',
    items: [{ to: '/calendario', icon: Calendar, labelKey: 'nav.calendar', capability: 'canViewFinanzas' }],
  },
  {
    labelKey: 'nav.sections.reportes',
    items: [
      { to: '/reportes', icon: FileText, labelKey: 'nav.financialSummary', capability: 'canViewReportes' },
      { to: '/historial-precios', icon: TrendingUp, labelKey: 'nav.priceHistory', capability: 'canViewPriceHistory' },
      { to: '/cierre-mes', icon: CalendarCheck, labelKey: 'nav.cierreMes' },
    ],
  },
  {
    labelKey: 'nav.sections.sistema',
    items: [
      { to: '/admin/usuarios', icon: Users, labelKey: 'nav.users', capability: 'canManageUsers' },
      { to: '/configuracion', icon: Settings, labelKey: 'nav.settings' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const pendingApprovals = usePendingApprovals()
  const pendingCortes = usePendingCortes()
  const app = useAppRoles()

  function getBadgeCount(item: NavItem): number {
    if (item.to === '/ordenes-compra') return pendingApprovals
    if (item.badgeKey === 'cortes') return pendingCortes
    return 0
  }

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.capability || app[item.capability]),
  })).filter((section) => section.items.length > 0)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />}

      <aside
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-app-surface border-r border-app-border
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-app-border shrink-0 bg-gradient-to-r from-blue-700 to-blue-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">{t('nav.brand')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 -mr-1 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            title={t('nav.closeMenu')}
            aria-label={t('nav.closeMenuAria')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-2.5 space-y-5 overflow-y-auto flex-1 min-h-0 pt-3">
          {sections.map((section) => (
            <div key={section.labelKey}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-app-subtle select-none">
                {t(section.labelKey)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const badge = getBadgeCount(item)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-sm'
                            : 'text-app-muted hover:bg-app-hover hover:text-app-text'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                          )}
                          <item.icon
                            className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-app-subtle group-hover:text-app-muted'}`}
                          />
                          <span className="flex-1 truncate">{t(item.labelKey)}</span>
                          {badge > 0 && (
                            <span className="text-[10px] font-bold bg-orange-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none shrink-0">
                              {badge}
                            </span>
                          )}
                          {!isActive && badge === 0 && (
                            <ChevronRight className="w-3 h-3 text-app-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-app-border p-3 shrink-0">
          <ThemeToggle showLabelAlways />
        </div>
      </aside>
    </>
  )
}
