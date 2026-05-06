import type { InventoryTab } from './inventoryConfig'

export function InventoryTabs({ tab, onChange }: { tab: InventoryTab; onChange: (tab: InventoryTab) => void }) {
  return (
    <div className="flex gap-1 bg-app-hover rounded-lg p-1 w-fit">
      {(['stock', 'movements'] as const).map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${tab === value ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-muted hover:text-app-text'}`}
        >
          {value === 'stock' ? 'Stock actual' : 'Movimientos'}
        </button>
      ))}
    </div>
  )
}
