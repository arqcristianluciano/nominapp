import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Link2, Link2Off, Layers } from 'lucide-react'
import {
  getCortesByPayroll,
  getApprovedCortesByProject,
  corteService,
  adelantoService,
} from '@/services/cubicationService'
import { payrollService } from '@/services/payrollService'
import { formatRD, formatNumber } from '@/utils/currency'
import { CorteAdelantoConfirm } from './CorteAdelantoConfirm'
import type { ContractCorte, AdjustmentContract } from '@/types/database'

type LinkedCorte = ContractCorte & { contract: AdjustmentContract | null }

interface Props {
  periodId: string
  projectId: string
  isDraft: boolean
  onCorteLinked: () => void
}

export function CubicacionesPayrollSection({ periodId, projectId, isDraft, onCorteLinked }: Props) {
  const [linked, setLinked] = useState<LinkedCorte[]>([])
  const [available, setAvailable] = useState<LinkedCorte[]>([])
  const [showAvailable, setShowAvailable] = useState(false)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCorte, setPendingCorte] = useState<LinkedCorte | null>(null)
  const [pendingAdelantoTotal, setPendingAdelantoTotal] = useState(0)

  const load = useCallback(async () => {
    const [l, a] = await Promise.all([
      getCortesByPayroll(periodId),
      isDraft ? getApprovedCortesByProject(projectId) : Promise.resolve([]),
    ])
    setLinked(l)
    setAvailable(a)
    setLoading(false)
  }, [periodId, projectId, isDraft])

  useEffect(() => { load() }, [load])

  async function doLink(corte: LinkedCorte, deductAdelantos: boolean) {
    if (!corte.partida || !corte.contract) return
    setLinking(true)
    try {
      await payrollService.addLaborItem({
        payroll_period_id: periodId,
        contractor_id: (corte.contract as any).contractor_id,
        description: `CUBICACIÓN CORTE #${corte.cut_number} — ${(corte.partida as any).description}`,
        quantity: corte.measured_quantity,
        unit: (corte.partida as any).unit,
        unit_price: (corte.partida as any).unit_price,
        sort_order: 99,
        notes: `Retención: ${formatRD(corte.retention_amount)}`,
      })
      if (deductAdelantos && pendingAdelantoTotal > 0) {
        await payrollService.addLaborItem({
          payroll_period_id: periodId,
          contractor_id: (corte.contract as any).contractor_id,
          description: `DEDUCCIÓN ADELANTOS — ${(corte.contract as any)?.contractor?.name}`,
          quantity: 1,
          unit: 'global',
          unit_price: -pendingAdelantoTotal,
          is_advance_deduction: true,
          sort_order: 100,
        })
      }
      await corteService.linkToPayroll(corte.id, periodId)
      onCorteLinked()
      await load()
    } finally {
      setLinking(false)
      setPendingCorte(null)
      setPendingAdelantoTotal(0)
    }
  }

  async function handleLink(corte: LinkedCorte) {
    if (!corte.partida || !corte.contract) return
    const adelantos = await adelantoService.getByContract(corte.contract_id)
    const total = adelantos.reduce((s, a) => s + a.amount, 0)
    if (total > 0) {
      setPendingAdelantoTotal(total)
      setPendingCorte(corte)
    } else {
      await doLink(corte, false)
    }
  }

  async function handleUnlink(corte: LinkedCorte) {
    setUnlinking(corte.id)
    try {
      await corteService.unlinkFromPayroll(corte.id)
      await load()
      onCorteLinked()
    } finally { setUnlinking(null) }
  }

  const totalLinked = linked.reduce((s, c) => s + c.amount, 0)
  const totalRetenido = linked.reduce((s, c) => s + c.retention_amount, 0)

  if (loading) return null
  if (linked.length === 0 && !isDraft) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-app-muted" />
          <h2 className="text-lg font-medium text-app-text">Cubicaciones</h2>
          {linked.length > 0 && (
            <span className="text-xs text-app-muted bg-app-chip px-2 py-0.5 rounded-full">
              {linked.length} corte{linked.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isDraft && available.length > 0 && (
          <button
            onClick={() => setShowAvailable(!showAvailable)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"
          >
            {showAvailable ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Link2 className="w-3.5 h-3.5" />
            Vincular cortes ({available.length})
          </button>
        )}
      </div>

      {linked.length > 0 && (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-2.5 font-medium text-app-muted">Contratista / Partida</th>
                <th className="text-right px-4 py-2.5 font-medium text-app-muted hidden sm:table-cell">Cant.</th>
                <th className="text-right px-4 py-2.5 font-medium text-app-muted">Monto</th>
                <th className="text-right px-4 py-2.5 font-medium text-app-muted hidden md:table-cell">Retención</th>
                {isDraft && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {linked.map((c) => (
                <tr key={c.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5">
                    <p className="text-app-text font-medium text-xs">{(c.contract as any)?.contractor?.name ?? '—'}</p>
                    <p className="text-app-muted text-xs mt-0.5">Corte #{c.cut_number} · {(c.partida as any)?.description ?? '—'}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-app-muted hidden sm:table-cell">
                    {formatNumber(c.measured_quantity)} {(c.partida as any)?.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(c.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600 hidden md:table-cell">{formatRD(c.retention_amount)}</td>
                  {isDraft && (
                    <td className="px-2 py-2.5">
                      <button onClick={() => handleUnlink(c)} disabled={unlinking === c.id} title="Desvincular corte"
                        className="p-1 text-app-subtle hover:text-red-500 disabled:opacity-40">
                        <Link2Off className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linked.length === 0 && isDraft && (
        <div className="bg-app-surface rounded-xl border border-dashed border-app-border p-6 text-center text-sm text-app-subtle mb-3">
          No hay cortes vinculados a este reporte
        </div>
      )}

      <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-teal-900 dark:text-teal-200">
          Total cubicaciones{totalRetenido > 0 && <span className="font-normal text-xs ml-1">(ret. {formatRD(totalRetenido)})</span>}
        </span>
        <span className="text-sm font-semibold text-teal-900 dark:text-teal-200">{formatRD(totalLinked)}</span>
      </div>

      {showAvailable && available.length > 0 && (
        <div className="mt-3 bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-app-border bg-app-bg">
            <p className="text-xs font-semibold text-app-muted uppercase">Cortes aprobados disponibles</p>
          </div>
          <div className="divide-y divide-app-border">
            {available.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-app-hover">
                <div>
                  <p className="text-sm font-medium text-app-text">
                    {(c.contract as any)?.contractor?.name ?? '—'} — Corte #{c.cut_number}
                  </p>
                  <p className="text-xs text-app-muted mt-0.5">
                    {(c.partida as any)?.description} · {formatNumber(c.measured_quantity)} {(c.partida as any)?.unit}
                    · Neto: {formatRD(c.amount - c.retention_amount)}
                  </p>
                </div>
                <button onClick={() => handleLink(c)} disabled={linking}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 shrink-0 ml-3">
                  <Link2 className="w-3.5 h-3.5" />
                  {linking ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingCorte && (
        <CorteAdelantoConfirm
          open={!!pendingCorte}
          onClose={() => { setPendingCorte(null); setPendingAdelantoTotal(0) }}
          corte={pendingCorte}
          adelantoTotal={pendingAdelantoTotal}
          linking={linking}
          onLink={(deduct) => doLink(pendingCorte, deduct)}
        />
      )}
    </section>
  )
}
