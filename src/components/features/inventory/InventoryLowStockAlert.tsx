import { AlertTriangle } from 'lucide-react'
import type { InventoryItem } from '@/services/inventoryService'

export function InventoryLowStockAlert({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Stock mínimo alcanzado</p>
        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">{items.map((item) => item.name).join(', ')}</p>
      </div>
    </div>
  )
}
