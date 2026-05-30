import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { approvalsService, type ApprovalRecord } from '@/services/approvalsService'
import { PAYROLL_ACTION_LABEL, describeItemEdit } from './payrollHistoryUtils'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PayrollHistorySection({ periodId }: { periodId: string }) {
  const [records, setRecords] = useState<ApprovalRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    approvalsService
      .getHistory('payroll_period', periodId)
      .then((data) => {
        if (!cancelled) setRecords(data)
      })
      .catch(() => {
        if (!cancelled) setRecords([])
      })
    return () => {
      cancelled = true
    }
  }, [periodId])

  // Sin entradas (p. ej. modo demo sin auditoría) → no ocupamos espacio.
  if (!records || records.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-app-muted" />
        <h2 className="text-lg font-medium text-app-text">Historial de cambios</h2>
      </div>
      <ol className="bg-app-surface rounded-xl border border-app-border divide-y divide-app-border overflow-hidden">
        {records.map((r) => {
          const detail = r.action === 'update' ? describeItemEdit(r.metadata) : null
          return (
            <li key={r.id} className="px-4 py-2.5 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-app-text font-medium">{PAYROLL_ACTION_LABEL[r.action] ?? r.action}</span>
                {detail && <span className="text-app-muted"> · {detail}</span>}
                {r.actor_display_name && <span className="text-app-muted"> · por {r.actor_display_name}</span>}
                {r.motivo && <p className="text-xs text-app-subtle mt-0.5 break-words">{r.motivo}</p>}
              </div>
              <time className="shrink-0 text-xs text-app-subtle whitespace-nowrap" dateTime={r.created_at}>
                {formatWhen(r.created_at)}
              </time>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
