import { useEffect, useState } from 'react'
import { ScrollText, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { payrollService } from '@/services/payrollService'
import { corteService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { ContractCorte, ContractPartida, PayrollPeriod } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  contractorId: string
  corte: ContractCorte | null
  partida: ContractPartida | null
  onLinked: () => void
}

export function LinkToPayrollModal({ open, onClose, projectId, contractorId, corte, partida, onLinked }: Props) {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return
    setLoading(true)
    payrollService.getPeriods(projectId)
      .then((all) => setPeriods(all.filter((p) => p.status === 'draft')))
      .finally(() => setLoading(false))
  }, [open, projectId])

  async function handleLink() {
    if (!selectedId || !corte || !partida) return
    setSaving(true)
    try {
      await payrollService.addLaborItem({
        payroll_period_id: selectedId,
        contractor_id: contractorId,
        description: `CUBICACIÓN CORTE #${corte.cut_number} — ${partida.description}`,
        quantity: corte.measured_quantity,
        unit: partida.unit,
        unit_price: partida.unit_price,
        sort_order: 99,
        notes: `Corte del ${new Date(corte.cut_date).toLocaleDateString('es-DO')}. Retención: ${formatRD(corte.retention_amount)}`,
      })
      await corteService.linkToPayroll(corte.id, selectedId)
      onLinked()
      onClose()
    } finally { setSaving(false) }
  }

  if (!corte || !partida) return null

  return (
    <Modal open={open} onClose={onClose} title={`Enviar corte #${corte.cut_number} a nómina`}>
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <p><strong>Partida:</strong> {partida.description}</p>
          <p><strong>Cantidad:</strong> {corte.measured_quantity} {partida.unit} × {formatRD(partida.unit_price)} = <strong>{formatRD(corte.amount)}</strong></p>
          <p><strong>Retención:</strong> {formatRD(corte.retention_amount)} · <strong>Neto a pagar: {formatRD(corte.amount - corte.retention_amount)}</strong></p>
        </div>

        <div>
          <label className="block text-xs font-medium text-app-muted mb-2">Seleccionar reporte (borrador)</label>
          {loading ? (
            <p className="text-sm text-app-muted">Cargando reportes...</p>
          ) : periods.length === 0 ? (
            <div className="bg-app-chip rounded-lg p-3 text-sm text-app-muted text-center">
              No hay reportes en borrador para este proyecto.
              <br />
              <a href={`/proyectos/${projectId}/nominas`} className="text-blue-600 hover:underline text-xs mt-1 inline-flex items-center gap-1">
                Crear reporte <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => (
                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedId === p.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-app-border hover:border-gray-400'
                }`}>
                  <input type="radio" name="period" value={p.id} checked={selectedId === p.id} onChange={() => setSelectedId(p.id)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-app-text">Reporte #{p.period_number}</p>
                    <p className="text-xs text-app-muted">{new Date(p.report_date).toLocaleDateString('es-DO')}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleLink} disabled={saving || !selectedId}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          <ScrollText className="w-4 h-4" />
          {saving ? 'Enviando...' : 'Agregar a reporte y marcar pagado'}
        </button>
      </div>
    </Modal>
  )
}
