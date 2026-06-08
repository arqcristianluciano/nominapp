import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Menu, Search, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { loadSearchIndex, filterIndex, type GlobalSearchResult } from '@/services/globalSearchService'
import { NotificationDropdown } from './NotificationDropdown'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'

interface HeaderProps {
  onMenuClick: () => void
}

type SearchResultType = GlobalSearchResult['type']

const TYPE_COLOR: Record<SearchResultType, string> = {
  proyecto: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  contratista: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  suplidor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
  prestamo: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  contrato: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

function userInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return displayName.slice(0, 2).toUpperCase() || '?'
}

/** Agrupa los resultados por tipo manteniendo el orden canónico. */
function groupByType(results: GlobalSearchResult[]): Array<{ type: SearchResultType; items: GlobalSearchResult[] }> {
  const order: SearchResultType[] = ['proyecto', 'contratista', 'suplidor', 'contrato', 'prestamo']
  const map = new Map<SearchResultType, GlobalSearchResult[]>()
  for (const r of results) {
    if (!map.has(r.type)) map.set(r.type, [])
    map.get(r.type)!.push(r)
  }
  return order.flatMap((type) => {
    const items = map.get(type)
    return items && items.length > 0 ? [{ type, items }] : []
  })
}

// ---------------------------------------------------------------------------
// SearchDropdown: componente puro para renderizar el contenido del dropdown.
// Se define fuera de Header para que el linter no lo clasifique como
// "componente creado durante el render".
// ---------------------------------------------------------------------------
interface SearchDropdownProps {
  isSearching: boolean
  noResults: boolean
  searchLoadError: boolean
  debouncedQuery: string
  groupedResults: Array<{ type: SearchResultType; items: GlobalSearchResult[] }>
  onSelect: (url: string) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function SearchDropdown({
  isSearching,
  noResults,
  searchLoadError,
  debouncedQuery,
  groupedResults,
  onSelect,
  t,
}: SearchDropdownProps) {
  if (isSearching) {
    return (
      <div className="px-4 py-3 text-sm text-app-muted flex items-center gap-2">
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        {t('header.searching')}
      </div>
    )
  }
  if (noResults) {
    return (
      <div className="px-4 py-3 text-sm text-app-muted">
        {searchLoadError && (
          <p className="mb-1 text-xs text-red-500 dark:text-red-400">{t('header.searchLoadError')}</p>
        )}
        {t('header.noResults', { query: debouncedQuery })}
      </div>
    )
  }
  return (
    <>
      {groupedResults.map(({ type, items }) => (
        <div key={type}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-app-subtle bg-app-bg border-b border-app-border">
            {t(`header.types.${type}`)}
          </div>
          {items.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => onSelect(item.url)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-hover text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text truncate">{item.name}</p>
                {item.detail && <p className="text-xs text-app-muted truncate">{item.detail}</p>}
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${TYPE_COLOR[item.type]}`}>
                {t(`header.types.${item.type}`)}
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Hook: carga el índice de búsqueda una sola vez (sin disparar setState dentro
// del cuerpo del effect — el estado inicial ya es `true` para indexLoading).
// ---------------------------------------------------------------------------
function useSearchIndex() {
  // indexLoading comienza en true para que el spinner aparezca desde el primer
  // carácter antes de que la carga termine.
  const [searchIndex, setSearchIndex] = useState<Awaited<ReturnType<typeof loadSearchIndex>> | null>(null)
  const [indexLoading, setIndexLoading] = useState(true)
  const [searchLoadError, setSearchLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSearchIndex()
      .then((index) => {
        if (!cancelled) {
          setSearchIndex(index)
          setSearchLoadError(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load search index', err)
        if (!cancelled) setSearchLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { searchIndex, indexLoading, searchLoadError }
}

// ---------------------------------------------------------------------------
// Header principal
// ---------------------------------------------------------------------------
export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { projects } = useProjectStore()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const { searchIndex, indexLoading, searchLoadError } = useSearchIndex()

  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mobileWrapperRef = useRef<HTMLDivElement>(null)

  // Debounce: actualiza debouncedQuery 250 ms después de que el usuario para de escribir
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(id)
  }, [query])

  const projectsForIndex = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        location: p.location,
      })),
    [projects],
  )

  const results = useMemo<GlobalSearchResult[]>(() => {
    if (!debouncedQuery.trim() || !searchIndex) return []
    return filterIndex(searchIndex, projectsForIndex, debouncedQuery)
  }, [debouncedQuery, searchIndex, projectsForIndex])

  const groupedResults = useMemo(() => groupByType(results), [results])

  // Indicadores derivados para el dropdown
  const isSearching = debouncedQuery.trim().length > 0 && (indexLoading || query !== debouncedQuery)
  const noResults =
    debouncedQuery.trim().length > 0 && !indexLoading && query === debouncedQuery && results.length === 0
  const dropdownVisible = showResults && debouncedQuery.trim().length > 0

  // Click fuera cierra el dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (wrapperRef.current && !wrapperRef.current.contains(target)) setShowResults(false)
      if (mobileWrapperRef.current && !mobileWrapperRef.current.contains(target)) {
        setMobileSearchOpen(false)
        setQuery('')
        setDebouncedQuery('')
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
        setDebouncedQuery('')
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
    if (!mobileSearchOpen) return
    const id = setTimeout(() => mobileInputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [mobileSearchOpen])

  const handleSelect = useCallback(
    (url: string) => {
      navigate(url)
      setQuery('')
      setDebouncedQuery('')
      setShowResults(false)
      setMobileSearchOpen(false)
    },
    [navigate],
  )

  function clearSearch() {
    setQuery('')
    setDebouncedQuery('')
    setShowResults(false)
    inputRef.current?.focus()
  }

  const dropdownProps: Omit<SearchDropdownProps, 'onSelect' | 't'> = {
    isSearching,
    noResults,
    searchLoadError,
    debouncedQuery,
    groupedResults,
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-app-surface border-b border-app-border flex items-center justify-between px-4 lg:px-6 shadow-xs">
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
          aria-label={t('nav.openMenuAria')}
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
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            placeholder={t('header.searchPlaceholder')}
            className="w-full pl-10 pr-20 py-2 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-app-surface transition-all"
          />
          {query ? (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-app-subtle hover:text-app-muted rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-app-subtle bg-app-chip border border-app-border rounded-md pointer-events-none">
              Ctrl K
            </kbd>
          )}
          {dropdownVisible && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-app-surface border border-app-border rounded-xl shadow-md max-h-80 overflow-y-auto z-50 divide-y divide-app-border">
              <SearchDropdown {...dropdownProps} onSelect={handleSelect} t={t} />
            </div>
          )}
        </div>

        {/* Mobile: spacer */}
        <div className="lg:hidden flex-1" />

        <div className="flex items-center gap-1">
          {/* Mobile search button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
            title={t('header.searchTitle')}
            aria-label={t('header.searchTitle')}
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          <LanguageSwitcher />
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
                onClick={async () => {
                  await logout()
                  navigate('/login', { replace: true })
                }}
                className="p-2 rounded-lg text-app-muted hover:bg-app-hover hover:text-app-text transition-colors"
                title={t('header.logout')}
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
                placeholder={t('header.searchPlaceholderMobile')}
                className="flex-1 pl-10 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  setMobileSearchOpen(false)
                  setQuery('')
                  setDebouncedQuery('')
                }}
                className="p-2 rounded-lg text-app-muted hover:text-app-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {debouncedQuery.trim().length > 0 && (
              <div className="mt-2 bg-app-surface border border-app-border rounded-xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-app-border">
                <SearchDropdown {...dropdownProps} onSelect={handleSelect} t={t} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
