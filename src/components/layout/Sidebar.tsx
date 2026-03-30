import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { usePendingApprovals } from '@/hooks/usePendingApprovals'
import { usePendingCortes } from '@/hooks/usePendingCortes'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badgeKey?: 'approvals' | 'cortes'
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'General',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/proyectos', icon: Building2, label: 'Proyectos' },
      { to: '/nominas', icon: ScrollText, label: 'Reportes' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', icon: Landmark, label: 'Control Financiero' },
      { to: '/presupuesto', icon: BarChart3, label: 'Presupuesto' },
      { to: '/cxp', icon: CreditCard, label: 'Cuentas por Pagar' },
      { to: '/cubicaciones', icon: Layers, label: 'Cubicaciones', badgeKey: 'cortes' as const },
    ],
  },
  {
    label: 'Compras',
    items: [
      { to: '/ordenes-compra', icon: ShoppingCart, label: 'Órdenes de Compra' },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { to: '/contratistas', icon: HardHat, label: 'Contratistas' },
      { to: '/suplidores', icon: Truck, label: 'Suplidores' },
      { to: '/prestamos', icon: Banknote, label: 'Préstamos' },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { to: '/calendario', icon: Calendar, label: 'Calendario de pagos' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { to: '/reportes', icon: FileText, label: 'Resumen financiero' },
      { to: '/historial-precios', icon: TrendingUp, label: 'Historial de precios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/configuracion', icon: Settings, label: 'Configuración' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pendingApprovals = usePendingApprovals()
  const pendingCortes = usePendingCortes()

  function getBadgeCount(item: NavItem): number {
    if (item.to === '/ordenes-compra') return pendingApprovals
    if (item.badgeKey === 'cortes') return pendingCortes
    return 0
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
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
            <span className="text-base font-semibold text-white tracking-tight">NominaAPP</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-2.5 space-y-5 overflow-y-auto flex-1 min-h-0 pt-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-app-subtle select-none">
                {section.label}
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
                          <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-app-subtle group-hover:text-app-muted'}`} />
                          <span className="flex-1 truncate">{item.label}</span>
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
