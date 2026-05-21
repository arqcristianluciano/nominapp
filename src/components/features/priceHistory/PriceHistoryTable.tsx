import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { MaterialHistory } from './priceHistoryTypes'

type SortKey = 'name' | 'latest' | 'avg' | 'minMax' | 'trend' | 'count' | 'date'
type SortDir = 'asc' | 'desc'

const FORMULA_PREFIXES = ['=', '+', '-', '@']

function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.length === 0) return str
  const needsPrefixGuard = FORMULA_PREFIXES.includes(str[0])
  const guarded = needsPrefixGuard ? `'${str}` : str
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`
  return guarded
}

function getLatestEntryDate(history: MaterialHistory): string {
  let latest = ''
  for (const entry of history.entries) {
    if (entry.date > latest) latest = entry.date
  }
  return latest
}

function compareHistories(a: MaterialHistory, b: MaterialHistory, key: SortKey, dir: SortDir): number {
  const mult = dir === 'asc' ? 1 : -1
  let result = 0
  switch (key) {
    case 'name': {
      const an = (a.supplier ?? a.entries[0]?.description ?? a.key).toLowerCase()
      const bn = (b.supplier ?? b.entries[0]?.description ?? b.key).toLowerCase()
      result = an.localeCompare(bn, 'es')
      break
    }
    case 'latest':
      result = a.latestPrice - b.latestPrice
      break
    case 'avg':
      result = a.avgPrice - b.avgPrice
      break
    case 'minMax':
      result = a.minPrice - b.minPrice
      break
    case 'trend': {
      const order: Record<MaterialHistory['trend'], number> = { down: -1, stable: 0, up: 1 }
      result = order[a.trend] - order[b.trend]
      if (result === 0) result = a.trendPct - b.trendPct
      break
    }
    case 'count':
      result = a.entries.length - b.entries.length
      break
    case 'date': {
      const ad = getLatestEntryDate(a)
      const bd = getLatestEntryDate(b)
      result = ad.localeCompare(bd)
      break
    }
  }
  return result * mult
}

export function PriceHistoryTable({
  items,
  expanded,
  onToggle,
}: {
  items: MaterialHistory[]
  expanded: string | null
  onToggle: (key: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [supplierFilter, setSupplierFilter] = useState<string>('__all__')

  const supplierOptions = useMemo(() => {
    const set = new Set<string>()
    let hasNone = false
    for (const item of items) {
      if (item.supplier) set.add(item.supplier)
      else hasNone = true
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
    return { suppliers: sorted, hasNone }
  }, [items])

  const filtered = useMemo(() => {
    if (supplierFilter === '__all__') return items
    if (supplierFilter === '__none__') return items.filter((i) => !i.supplier)
    return items.filter((i) => i.supplier === supplierFilter)
  }, [items, supplierFilter])

  const sorted = useMemo(() => {
    const copy = filtered.slice()
    copy.sort((a, b) => compareHistories(a, b, sortKey, sortDir))
    return copy
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const handleExportCsv = () => {
    const headers = ['Material', 'Proveedor', 'Fecha mas reciente', 'Precio actual', 'Promedio', 'Minimo', 'Maximo', 'Tendencia', 'Variacion %', 'Registros']
    const lines: string[] = [headers.join(',')]
    for (const h of sorted) {
      const name = h.supplier ?? h.entries[0]?.description ?? h.key
      const trendLabel = h.trend === 'up' ? 'Subida' : h.trend === 'down' ? 'Bajada' : 'Estable'
      const row = [
        sanitizeCsvCell(name),
        sanitizeCsvCell(h.supplier ?? ''),
        sanitizeCsvCell(getLatestEntryDate(h)),
        sanitizeCsvCell(formatRD(h.latestPrice)),
        sanitizeCsvCell(formatRD(h.avgPrice)),
        sanitizeCsvCell(formatRD(h.minPrice)),
        sanitizeCsvCell(formatRD(h.maxPrice)),
        sanitizeCsvCell(trendLabel),
        sanitizeCsvCell(h.trendPct.toFixed(2)),
        sanitizeCsvCell(String(h.entries.length)),
      ]
      lines.push(row.join(','))
    }
    const csv = '﻿' + lines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    a.download = `historial-precios-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 border-b border-app-border bg-app-hover/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-app-muted font-medium" htmlFor="supplier-filter">Proveedor:</label>
          <select
            id="supplier-filter"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-sm sm:text-xs border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="__all__">Todos ({items.length})</option>
            {supplierOptions.hasNone && <option value="__none__">Sin proveedor</option>}
            {supplierOptions.suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-xs text-app-subtle">{sorted.length} resultado{sorted.length === 1 ? '' : 's'}</span>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sorted.length === 0}
          className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-medium border border-app-border rounded-lg bg-app-bg text-app-text hover:bg-app-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-app-border">
        {sorted.length === 0 ? (
          <div className="px-4 py-6 text-center text-app-muted text-sm">Sin resultados para el filtro seleccionado.</div>
        ) : (
          sorted.map((history) => (
            <PriceHistoryMobileCard key={history.key} history={history} expanded={expanded === history.key} onToggle={() => onToggle(history.key)} />
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
            <SortableTh label="Material / Proveedor" align="left" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableTh label="Precio actual" align="right" sortKey="latest" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableTh label="Promedio" align="right" sortKey="avg" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <SortableTh label="Min / Max" align="right" sortKey="minMax" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
            <SortableTh label="Tendencia" align="center" sortKey="trend" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableTh label="Registros" align="center" sortKey="count" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            <SortableTh label="Ult. fecha" align="right" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
          </tr></thead>
          <tbody className="divide-y divide-app-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-app-muted text-sm">Sin resultados para el filtro seleccionado.</td>
              </tr>
            ) : (
              sorted.map((history) => (
                <PriceHistoryRow key={history.key} history={history} expanded={expanded === history.key} onToggle={() => onToggle(history.key)} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortableTh({
  label,
  align,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string
  align: 'left' | 'right' | 'center'
  sortKey: SortKey
  currentKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = currentKey === sortKey
  const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
  const justifyCls = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'
  return (
    <th className={`${alignCls} px-4 py-2.5 font-medium ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${justifyCls} hover:text-app-text ${active ? 'text-app-text' : ''}`}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        {active ? (
          dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

function PriceHistoryMobileCard({
  history,
  expanded,
  onToggle,
}: {
  history: MaterialHistory
  expanded: boolean
  onToggle: () => void
}) {
  const latestDate = getLatestEntryDate(history)
  const name = history.supplier ?? history.entries[0]?.description ?? history.key
  return (
    <div className="px-3 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left min-h-[44px]"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-app-text capitalize break-words">{name}</p>
            {history.supplier && history.entries[0]?.description && (
              <p className="text-xs text-app-muted break-words mt-0.5">{history.entries[0].description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-app-text">{formatRD(history.latestPrice)}</p>
            <p className="text-[11px] text-app-subtle mt-0.5">
              {latestDate ? new Date(latestDate + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2 text-xs">
          <div className="flex items-center gap-2 text-app-muted">
            <span>Prom. {formatRD(history.avgPrice)}</span>
            <span className="text-app-subtle">·</span>
            <span>{history.entries.length} reg.</span>
          </div>
          <div>
            {history.trend === 'up' ? (
              <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><TrendingUp className="w-3.5 h-3.5" />+{history.trendPct.toFixed(1)}%</span>
            ) : history.trend === 'down' ? (
              <span className="inline-flex items-center gap-1 text-green-600 font-semibold"><TrendingDown className="w-3.5 h-3.5" />{history.trendPct.toFixed(1)}%</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-app-muted"><Minus className="w-3.5 h-3.5" />Estable</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-app-subtle">
          <span><span className="text-green-600">{formatRD(history.minPrice)}</span> <span className="mx-1">/</span> <span className="text-red-600">{formatRD(history.maxPrice)}</span></span>
          <span>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
        </div>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-app-border">
          <p className="text-[11px] font-semibold text-app-muted mb-2 uppercase tracking-wide">Historial de precios</p>
          <div className="space-y-2">
            {(() => {
              const seenKeys = new Map<string, number>()
              return history.entries.map((entry, index) => {
                const prev = index > 0 ? history.entries[index - 1].unit_price : null
                const change = prev ? ((entry.unit_price - prev) / prev) * 100 : null
                const baseKey = `${history.key}-${entry.date}-${entry.project}`
                const dup = seenKeys.get(baseKey) ?? 0
                seenKeys.set(baseKey, dup + 1)
                const rowKey = dup === 0 ? baseKey : `${baseKey}#${dup}`
                return (
                  <div key={rowKey} className="bg-app-hover/30 rounded-lg p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-app-muted">{new Date(entry.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="font-semibold text-app-text">
                        {formatRD(entry.unit_price)}
                        {change !== null && (
                          <span className={`ml-1.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-app-subtle'}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1 text-app-muted text-[11px]">
                      <span className="truncate min-w-0">{entry.project}</span>
                      <span className="shrink-0">Cant. {entry.quantity > 0 ? entry.quantity : '—'}</span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function PriceHistoryRow({
  history,
  expanded,
  onToggle,
}: {
  history: MaterialHistory
  expanded: boolean
  onToggle: () => void
}) {
  const latestDate = getLatestEntryDate(history)
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-app-hover/50 cursor-pointer">
        <td className="px-4 py-3"><p className="font-medium text-app-text capitalize">{history.supplier ?? history.entries[0]?.description ?? history.key}</p>{history.supplier && <p className="text-xs text-app-muted truncate">{history.entries[0]?.description}</p>}</td>
        <td className="px-4 py-3 text-right font-semibold text-app-text">{formatRD(history.latestPrice)}</td>
        <td className="px-4 py-3 text-right text-app-muted hidden sm:table-cell">{formatRD(history.avgPrice)}</td>
        <td className="px-4 py-3 text-right text-xs hidden md:table-cell"><span className="text-green-600">{formatRD(history.minPrice)}</span><span className="text-app-subtle mx-1">/</span><span className="text-red-600">{formatRD(history.maxPrice)}</span></td>
        <td className="px-4 py-3 text-center">{history.trend === 'up' ? <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" />+{history.trendPct.toFixed(1)}%</span> : history.trend === 'down' ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold"><TrendingDown className="w-3.5 h-3.5" />{history.trendPct.toFixed(1)}%</span> : <span className="inline-flex items-center gap-1 text-app-muted text-xs"><Minus className="w-3.5 h-3.5" />Estable</span>}</td>
        <td className="px-4 py-3 text-center text-app-muted text-xs hidden sm:table-cell">{history.entries.length}</td>
        <td className="px-4 py-3 text-right text-app-muted text-xs hidden lg:table-cell">{latestDate ? new Date(latestDate + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
      </tr>
      {expanded && (
        <tr className="bg-app-hover/20">
          <td colSpan={7} className="px-4 py-3">
            <p className="text-xs font-semibold text-app-muted mb-2 uppercase tracking-wide">Historial de precios</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-app-subtle"><th className="text-left py-1 pr-4">Fecha</th><th className="text-right py-1 pr-4">Precio unitario</th><th className="text-right py-1 pr-4">Cantidad</th><th className="text-left py-1">Proyecto</th></tr></thead>
                <tbody>
                  {(() => {
                    const seenKeys = new Map<string, number>()
                    return history.entries.map((entry, index) => {
                      const prev = index > 0 ? history.entries[index - 1].unit_price : null
                      const change = prev ? ((entry.unit_price - prev) / prev) * 100 : null
                      const baseKey = `${history.key}-${entry.date}-${entry.project}`
                      const dup = seenKeys.get(baseKey) ?? 0
                      seenKeys.set(baseKey, dup + 1)
                      const rowKey = dup === 0 ? baseKey : `${baseKey}#${dup}`
                      return (
                      <tr key={rowKey} className="border-t border-app-border/30">
                        <td className="py-1 pr-4 text-app-muted">{new Date(entry.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-1 pr-4 text-right font-semibold text-app-text">{formatRD(entry.unit_price)}{change !== null && <span className={`ml-1.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-app-subtle'}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>}</td>
                        <td className="py-1 pr-4 text-right text-app-muted">{entry.quantity > 0 ? entry.quantity : '—'}</td>
                        <td className="py-1 text-app-muted truncate max-w-[200px]">{entry.project}</td>
                      </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
