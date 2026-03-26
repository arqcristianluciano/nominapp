import { useState } from 'react'
import { Plus, Trash2, CheckCircle, Circle, Clock, Image, ScrollText } from 'lucide-react'
import { corteService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import { CorteApprovalModal } from './CorteApprovalModal'
import { LinkToPayrollModal } from './LinkToPayrollModal'
import type { ContractCorte, ContractPartida, CorteStatus } from '@/types/database'

interface Props {
  contractId: string
  projectId: string
  contractorId: string
  retentionPercent: number
  partidas: ContractPartida[]
  cortes: ContractCorte[]
  onRefresh: () => void
}

const STATUS_CFG: Record<CorteStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  draft:    { label: 'Borrador', icon: <Circle className="w-3 h-3" />,       cls: 'text-app-muted bg-app-chip' },
  approved: { label: 'Aprobado', icon: <Clock className="w-3 h-3" />,        cls: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20' },
  paid:     { label: 'Pagado',   icon: <CheckCircle className="w-3 h-3" />,  cls: 'text-green-700 bg-green-50 dark:bg-green-950/20' },
}

const emptyForm = { partida_id: '', cut_date: '', measured_quantity: '', notes: '', photo_url: '' }

export function CorteSection({ contractId, projectId, contractorId, retentionPercent, partidas, cortes, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approvalCorte, setApprovalCorte] = useState<ContractCorte | null>(null)
  const [payrollCorte, setPayrollCorte] = useState<ContractCorte | null>(null)

  const selectedPartida = partidas.find((p) => p.id === form.partida_id)
  const previewAmount = selectedPartida && form.measured_quantity
    ? Number(form.measured_quantity) * selectedPartida.unit_price : 0
  const previewRetention = (previewAmount * retentionPercent) / 100

  async function handleCreate() {
    if (!form.partida_id || !form.cut_date || !form.measured_quantity) return
    const partida = partidas.find((p) => p.id === form.partida_id)
    if (!partida) return
    setSaving(true)
    try {
      const nextNum = cortes.length > 0 ? Math.max(...cortes.map((c) => c.cut_number)) + 1 : 1
      await corteService.create(
        { contract_id: contractId, partida_id: form.partida_id, cut_number: nextNum, cut_date: form.cut_date,
          measured_quantity: Number(form.measured_quantity), status: 'draft', notes: form.notes || null, photo_url: form.photo_url || null },
        partida, retentionPercent,
      )
      setForm(emptyForm); setShowAdd(false); onRefresh()
    } finally { setSaving(false) }
  }

  async function handleApprove(corteId: string, approvedBy: string, signature: string) {
    await corteService.approve(corteId, approvedBy, signature)
    setApprovalCorte(null); onRefresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este corte?')) return
    await corteService.delete(id); onRefresh()
  }

  const inputCls = 'px-2 py-1.5 border border-app-border rounded-md text-xs bg-app-input-bg text-app-text focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-app-muted">Cada corte registra la cantidad medida y genera el monto ({retentionPercent}% retención).</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Corte
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Partida *</p>
              <select value={form.partida_id} onChange={(e) => setForm({ ...form, partida_id: e.target.value })} className={`${inputCls} w-full`}>
                <option value="">Seleccionar partida...</option>
                {partidas.map((p) => <option key={p.id} value={p.id}>{p.description} ({p.unit})</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-app-muted mb-1">Fecha *</p>
              <input type="date" value={form.cut_date} onChange={(e) => setForm({ ...form, cut_date: e.target.value })} className={`${inputCls} w-full`} />
            </div>
            <div>
              <p className="text-[10px] text-app-muted mb-1">Cant. medida *</p>
              <input type="number" value={form.measured_quantity} onChange={(e) => setForm({ ...form, measured_quantity: e.target.value })} placeholder="0" className={`${inputCls} w-full`} />
            </div>
          </div>
          {previewAmount > 0 && (
            <div className="flex gap-4 text-xs px-1">
              <span className="text-app-muted">Monto: <strong className="text-app-text">{formatRD(previewAmount)}</strong></span>
              <span className="text-app-muted">Retención: <strong className="text-red-600">{formatRD(previewRetention)}</strong></span>
              <span className="text-app-muted">A pagar: <strong className="text-green-700">{formatRD(previewAmount - previewRetention)}</strong></span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <p className="text-[10px] text-app-muted mb-1">Notas</p>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Descripción del avance..." className={`${inputCls} w-full`} />
            </div>
            <div>
              <p className="text-[10px] text-app-muted mb-1">URL de foto (opcional)</p>
              <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." className={`${inputCls} w-full`} />
            </div>
            <div className="flex gap-1 justify-end">
              <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className="px-2 py-1.5 text-xs border border-app-border rounded-md hover:bg-app-hover text-app-muted">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? '...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cortes.length === 0 && !showAdd ? (
        <p className="text-sm text-app-muted py-4 text-center">No hay cortes registrados.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-app-border">
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">#</th>
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
              <th className="pb-2 text-left text-[10px] font-semibold text-app-muted uppercase">Partida</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Cant.</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Monto</th>
              <th className="pb-2 text-right text-[10px] font-semibold text-app-muted uppercase">Retención</th>
              <th className="pb-2 text-center text-[10px] font-semibold text-app-muted uppercase">Estado</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {cortes.map((c) => {
              const partida = partidas.find((p) => p.id === c.partida_id)
              const cfg = STATUS_CFG[c.status]
              return (
                <tr key={c.id} className="hover:bg-app-hover">
                  <td className="py-2.5 text-app-muted">{c.cut_number}</td>
                  <td className="py-2.5 text-app-text">{new Date(c.cut_date).toLocaleDateString('es-DO')}</td>
                  <td className="py-2.5 text-app-muted">
                    <div className="flex items-center gap-1">
                      {c.photo_url && <a href={c.photo_url} target="_blank" rel="noreferrer" title="Ver foto" onClick={(e) => e.stopPropagation()}><Image className="w-3 h-3 text-blue-500 hover:text-blue-700" /></a>}
                      {partida?.description || '—'}
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-app-text">{c.measured_quantity} {partida?.unit}</td>
                  <td className="py-2.5 text-right text-app-text font-medium">{formatRD(c.amount)}</td>
                  <td className="py-2.5 text-right text-red-600">{formatRD(c.retention_amount)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.cls}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    {c.approved_by && <p className="text-[9px] text-app-subtle mt-0.5">{c.approved_by}</p>}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-0.5 justify-end">
                      {c.status === 'draft' && (
                        <button onClick={() => setApprovalCorte(c)} title="Aprobar corte"
                          className="p-1 text-app-subtle hover:text-green-600"><CheckCircle className="w-3.5 h-3.5" /></button>
                      )}
                      {c.status === 'approved' && (
                        <button onClick={() => setPayrollCorte(c)} title="Enviar a nómina"
                          className="p-1 text-app-subtle hover:text-blue-600"><ScrollText className="w-3.5 h-3.5" /></button>
                      )}
                      {c.status !== 'paid' && (
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <CorteApprovalModal
        open={!!approvalCorte}
        onClose={() => setApprovalCorte(null)}
        corteNum={approvalCorte?.cut_number ?? 0}
        amount={approvalCorte?.amount ?? 0}
        onApprove={(by, sig) => handleApprove(approvalCorte!.id, by, sig)}
      />

      <LinkToPayrollModal
        open={!!payrollCorte}
        onClose={() => setPayrollCorte(null)}
        projectId={projectId}
        contractorId={contractorId}
        corte={payrollCorte}
        partida={payrollCorte ? partidas.find((p) => p.id === payrollCorte.partida_id) ?? null : null}
        onLinked={onRefresh}
      />
    </div>
  )
}
