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
    <nav aria-label="Migas de pan" className="flex items-center gap-1 text-xs text-app-muted mb-4 flex-wrap">
      <ol className="flex items-center gap-1 flex-wrap list-none p-0 m-0">
        {all.map((item, i) => {
          const isLast = i === all.length - 1
          return (
            <li key={`${item.to ?? 'no-to'}-${item.label}`} className="flex items-center gap-1">
              {i === 0 && showHome && <Home className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-app-text focus-visible:text-app-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors font-medium truncate max-w-[160px] rounded-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`truncate max-w-[200px] ${isLast ? 'text-app-text font-semibold' : 'text-app-muted'}`}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="w-3 h-3 shrink-0 text-app-border" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
