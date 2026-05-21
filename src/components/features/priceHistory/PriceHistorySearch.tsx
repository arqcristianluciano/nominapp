import { Search } from 'lucide-react'

export function PriceHistorySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar material o proveedor..." className="w-full min-h-[44px] pl-9 pr-4 py-2.5 text-base sm:text-sm border border-app-border rounded-xl bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}
