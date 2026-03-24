import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, Search, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { supplierService } from '@/services/supplierService'
import { contractorService } from '@/services/contractorService'
import { NotificationDropdown } from './NotificationDropdown'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  onMenuClick: () => void
}

interface SearchResult {
  type: 'proyecto' | 'contratista' | 'suplidor'
  id: string
  name: string
  detail?: string
  url: string
}

function userInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return displayName.slice(0, 2).toUpperCase() || '?'
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { projects } = useProjectStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [allItems, setAllItems] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSearchData() {
      try {
        const [suppliers, contractors] = await Promise.all([
          supplierService.getAll(),
          contractorService.getAll(),
        ])
        const items: SearchResult[] = [
          ...projects.map((p) => ({
            type: 'proyecto' as const,
            id: p.id,
            name: p.name,
            detail: p.location || p.code,
            url: `/proyectos/${p.id}`,
          })),
          ...contractors.map((c) => ({
            type: 'contratista' as const,
            id: c.id,
            name: c.name,
            detail: c.specialty || '',
            url: '/contratistas',
          })),
          ...suppliers.map((s) => ({
            type: 'suplidor' as const,
            id: s.id,
            name: s.name,
            detail: s.rnc || '',
            url: '/suplidores',
          })),
        ]
        setAllItems(items)
      } catch {}
    }
    loadSearchData()
  }, [projects])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const q = query.toLowerCase()
    setResults(allItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8))
  }, [query, allItems])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const typeLabel: Record<string, string> = {
    proyecto: 'Proyecto',
    contratista: 'Contratista',
    suplidor: 'Suplidor',
  }

  const typeColor: Record<string, string> = {
    proyecto: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    contratista: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    suplidor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-app-surface border-b border-app-border flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-app-muted hover:text-app-text"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div ref={wrapperRef} className="hidden lg:block relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar proyectos, contratistas, suplidores..."
          className="w-full pl-10 pr-8 py-2 bg-app-bg border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-app-surface"
        />
        {query && (
          <button onClick={() => { setQuery(''); setShowResults(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-subtle hover:text-app-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {showResults && query && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-app-surface border border-app-border rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-app-muted">Sin resultados para "{query}"</div>
            ) : (
              results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => { navigate(item.url); setQuery(''); setShowResults(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-hover text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-text truncate">{item.name}</p>
                    {item.detail && <p className="text-xs text-app-muted truncate">{item.detail}</p>}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${typeColor[item.type]}`}>
                    {typeLabel[item.type]}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <NotificationDropdown />
        {user && (
          <>
            <div
              className="hidden sm:flex max-w-[10rem] items-center truncate text-xs text-app-muted"
              title={user.displayName}
            >
              {user.displayName}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium shrink-0">
              {userInitials(user.displayName)}
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              className="p-2 rounded-lg text-app-muted hover:bg-app-hover hover:text-app-text"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
