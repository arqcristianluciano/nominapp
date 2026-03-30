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

const TYPE_LABEL: Record<string, string> = {
  proyecto: 'Proyecto',
  contratista: 'Contratista',
  suplidor: 'Suplidor',
}

const TYPE_COLOR: Record<string, string> = {
  proyecto:    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  contratista: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  suplidor:    'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [allItems, setAllItems] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mobileWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSearchData() {
      try {
        const [suppliers, contractors] = await Promise.all([
          supplierService.getAll(),
          contractorService.getAll(),
        ])
        setAllItems([
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
        ])
      } catch {}
    }
    loadSearchData()
  }, [projects])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(allItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8))
  }, [query, allItems])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (wrapperRef.current && !wrapperRef.current.contains(target)) setShowResults(false)
      if (mobileWrapperRef.current && !mobileWrapperRef.current.contains(target)) {
        setMobileSearchOpen(false)
        setQuery('')
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const isMobile = window.innerWidth < 1024
        if (isMobile) {
          setMobileSearchOpen(true)
        } else {
          inputRef.current?.focus()
          inputRef.current?.select()
          setShowResults(true)
        }
      }
      if (e.key === 'Escape') {
        setShowResults(false)
        setMobileSearchOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50)
    }
  }, [mobileSearchOpen])

  function handleSelect(url: string) {
    navigate(url)
    setQuery('')
    setShowResults(false)
    setMobileSearchOpen(false)
  }

  function clearSearch() {
    setQuery('')
    setShowResults(false)
    inputRef.current?.focus()
  }

  const dropdownContent = (
    results.length === 0
      ? <div className="px-4 py-3 text-sm text-app-muted">Sin resultados para "{query}"</div>
      : results.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => handleSelect(item.url)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-hover text-left transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-app-text truncate">{item.name}</p>
              {item.detail && <p className="text-xs text-app-muted truncate">{item.detail}</p>}
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${TYPE_COLOR[item.type]}`}>
              {TYPE_LABEL[item.type]}
            </span>
          </button>
        ))
  )

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-app-surface border-b border-app-border flex items-center justify-between px-4 lg:px-6 shadow-xs">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop search */}
        <div ref={wrapperRef} className="hidden lg:block relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            placeholder="Buscar proyectos, contratistas..."
            className="w-full pl-10 pr-20 py-2 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-app-surface transition-all"
          />
          {query ? (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-app-subtle hover:text-app-muted rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-app-subtle bg-app-chip border border-app-border rounded-md pointer-events-none">
              Ctrl K
            </kbd>
          )}
          {showResults && query && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-app-surface border border-app-border rounded-xl shadow-md max-h-80 overflow-y-auto z-50 divide-y divide-app-border">
              {dropdownContent}
            </div>
          )}
        </div>

        {/* Mobile: spacer */}
        <div className="lg:hidden flex-1" />

        <div className="flex items-center gap-1">
          {/* Mobile search button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden p-2 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
            title="Buscar"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          <ThemeToggle />
          <NotificationDropdown />

          {user && (
            <>
              <div
                className="hidden sm:flex max-w-[9rem] items-center truncate text-xs text-app-muted ml-1"
                title={user.displayName}
              >
                {user.displayName}
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0 ml-0.5">
                {userInitials(user.displayName)}
              </div>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login', { replace: true }) }}
                className="p-2 rounded-lg text-app-muted hover:bg-app-hover hover:text-app-text transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col">
          <div ref={mobileWrapperRef} className="bg-app-surface border-b border-app-border p-3 shadow-md">
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3.5 w-4 h-4 text-app-subtle" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="flex-1 pl-10 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => { setMobileSearchOpen(false); setQuery('') }}
                className="p-2 rounded-lg text-app-muted hover:text-app-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {query && (
              <div className="mt-2 bg-app-surface border border-app-border rounded-xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-app-border">
                {dropdownContent}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
