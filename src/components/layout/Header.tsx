import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { supplierService } from '@/services/supplierService'
import { contractorService } from '@/services/contractorService'
import { NotificationDropdown } from './NotificationDropdown'

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

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
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
    proyecto: 'bg-blue-100 text-blue-700',
    contratista: 'bg-amber-100 text-amber-700',
    suplidor: 'bg-purple-100 text-purple-700',
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div ref={wrapperRef} className="hidden lg:block relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar proyectos, contratistas, suplidores..."
          className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
        />
        {query && (
          <button onClick={() => { setQuery(''); setShowResults(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {showResults && query && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">Sin resultados para "{query}"</div>
            ) : (
              results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => { navigate(item.url); setQuery(''); setShowResults(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.detail && <p className="text-xs text-gray-500 truncate">{item.detail}</p>}
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

      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
          CL
        </div>
      </div>
    </header>
  )
}
