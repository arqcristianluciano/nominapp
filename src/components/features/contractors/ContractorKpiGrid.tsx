import { formatRD } from '@/utils/currency'

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
  }

  return (
    <div className={`rounded-xl border border-app-border p-4 ${colors[color].bg}`}>
      <p className="text-xs text-app-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color].text}`}>{value}</p>
    </div>
  )
}

export function ContractorKpiGrid({
  totalPaid,
  totalContracted,
  projectCount,
  reportCount,
}: {
  totalPaid: number
  totalContracted: number
  projectCount: number
  reportCount: number
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard label="Total cobrado" value={formatRD(totalPaid)} color="emerald" />
      <KpiCard label="Contrato total" value={totalContracted > 0 ? formatRD(totalContracted) : '—'} color="blue" />
      <KpiCard label="Proyectos" value={projectCount} color="purple" />
      <KpiCard label="Reportes" value={reportCount} color="amber" />
    </div>
  )
}
