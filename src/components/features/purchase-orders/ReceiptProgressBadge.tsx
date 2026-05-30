import { PackageCheck } from 'lucide-react'
import type { ReceiptProgress } from '@/types/purchaseOrder'
import { formatNumber } from '@/utils/currency'

// Badge "recibido / pedido" para órdenes colocadas o (parcialmente) recibidas.
// No renderiza nada si no hay cantidad pedida.
export function ReceiptProgressBadge({ progress, className = '' }: { progress: ReceiptProgress; className?: string }) {
  const ordered = Number(progress.ordered ?? 0)
  const received = Number(progress.received ?? 0)
  if (ordered <= 0) return null
  const pct = Math.min(100, Math.max(0, Math.round((received / ordered) * 100)))
  const complete = received >= ordered - 1e-9
  const tone = complete
    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
    : received > 0
      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300'
      : 'bg-app-chip text-app-muted'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone} ${className}`}
      title={`${formatNumber(received)} de ${formatNumber(ordered)} recibido`}
    >
      <PackageCheck className="w-3 h-3" />
      {formatNumber(received)}/{formatNumber(ordered)} ({pct}%)
    </span>
  )
}
