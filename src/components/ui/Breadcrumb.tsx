import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  const all = showHome ? [{ label: 'Inicio', to: '/' }, ...items] : items

  return (
    <nav className="flex items-center gap-1 text-xs text-app-subtle mb-4 flex-wrap">
      {all.map((item, i) => {
        const isLast = i === all.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i === 0 && showHome && (
              <Home className="w-3 h-3 shrink-0" />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-app-text transition-colors font-medium truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[200px] ${isLast ? 'text-app-muted font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3 h-3 shrink-0 text-app-border" />}
          </span>
        )
      })}
    </nav>
  )
}
