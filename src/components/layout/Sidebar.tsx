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
} from 'lucide-react'
import { usePendingApprovals } from '@/hooks/usePendingApprovals'

interface NavSection {
  label: string
  items: { to: string; icon: React.ElementType; label: string }[]
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
    ],
  },
  {
    label: 'Reportes',
    items: [
      { to: '/reportes', icon: FileText, label: 'Resumen financiero' },
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

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-app-surface border-r border-app-border
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" />
            <span className="text-lg font-semibold text-app-text">NominaAPP</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-app-subtle hover:text-app-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-app-muted hover:bg-app-hover hover:text-app-text'
                      }`
                    }
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {to === '/ordenes-compra' && pendingApprovals > 0 && (
                      <span className="text-[10px] font-bold bg-orange-500 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center leading-none">
                        {pendingApprovals}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
