import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { payrollService } from '@/services/payrollService'
import { useAuthStore } from '@/stores/authStore'
import type { PayrollPeriod } from '@/types/database'

interface Props {
  projectId: string
  onCreated: (periodId: string) => void
  onCancel: () => void
}

export function CreatePayrollForm({ projectId, onCreated, onCancel }: Props) {
  const user = useAuthStore((s) => s.user)
  const reportedBy = user?.displayName ?? ''
  const [number, setNumber] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draftPeriod, setDraftPeriod] = useState<PayrollPeriod | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setChecking(true)
    Promise.all([
      payrollService.getNextPeriodNumber(projectId),
      payrollService.getDraftPeriod(projectId),
    ]).then(([nextNum, draft]) => {
      setNumber(nextNum)
      setDraftPeriod(draft)
    }).finally(() => setChecking(false))
  }, [projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (draftPeriod) return
    setSaving(true)
    setError('')
    try {
      const period = await payrollService.createPeriod({
        project_id: projectId,
        period_number: number,
        report_date: date,
        reported_by: reportedBy || undefined,
      })
      onCreated(period.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return <div className="text-sm text-app-muted py-4 text-center">Verificando...</div>
  }

  if (draftPeriod) {
    const statusLabel = draftPeriod.status === 'submitted' ? 'enviado' : 'borrador'
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <p className="font-medium mb-1">Hay un reporte sin concluir</p>
          <p className="text-amber-700">
            El <span className="font-semibold">Reporte No. {draftPeriod.period_number}</span> está en estado{' '}
            <span className="font-semibold">{statusLabel}</span>. Debe aprobarse o pagarse antes de crear uno nuevo.
          </p>
        </div>
        <div className="flex justify-between items-center pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted">
            Cerrar
          </button>
          <Link
            to={`/nominas/${draftPeriod.id}`}
            onClick={onCancel}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
          >
            Ver reporte pendiente
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">No. de nómina</label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(parseInt(e.target.value))}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Fecha de reporte</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Reportado por</label>
        <div className="w-full px-3 py-2 bg-app-chip text-app-muted border border-app-border rounded-lg text-sm select-none">
          {reportedBy}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Creando...' : 'Crear reporte'}
        </button>
      </div>
    </form>
  )
}
