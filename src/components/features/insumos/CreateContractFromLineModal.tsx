import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { contractService, partidaService } from '@/services/cubicationService'
import { mercadoBudgetLineService } from '@/services/mercadoBudgetService'
import type { MercadoBudgetLine } from '@/types/mercadoBudget'
import type { Contractor } from '@/types/database'
import { formatRD } from '@/utils/currency'

interface Props {
  line: MercadoBudgetLine
  projectId: string
  contractors: Contractor[]
  onCreated: (contractId: string) => void
  onClose: () => void
}

export function CreateContractFromLineModal({ line, projectId, contractors, onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    contractor_id: '',
    agreed_quantity: String(line.budgeted_quantity),
    agreed_unit_price: String(line.budgeted_unit_price),
    retention_percent: '5',
    signed_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agreedQty = parseFloat(form.agreed_quantity) || 0
  const agreedPrice = parseFloat(form.agreed_unit_price) || 0
  const budgetedTotal = line.budgeted_quantity * line.budgeted_unit_price
  const agreedTotal = agreedQty * agreedPrice
  const deviation = agreedTotal - budgetedTotal
  const deviationPct = budgetedTotal > 0 ? (deviation / budgetedTotal) * 100 : 0

  const inputCls = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-app-input-bg text-app-text focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-app-muted mb-1 block'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.contractor_id) { setError('Selecciona un contratista'); return }
    setSaving(true)
    setError(null)
    try {
      const contract = await contractService.create({
        project_id: projectId,
        contractor_id: form.contractor_id,
        retention_percent: Number(form.retention_percent),
        signed_date: form.signed_date || null,
        notes: form.notes || `Línea: ${line.description}`,
      })

      await partidaService.create({
        contract_id: contract.id,
        description: line.description,
        unit: line.unit,
        unit_price: agreedPrice,
        agreed_quantity: agreedQty,
        sort_order: 1,
      })

      await mercadoBudgetLineService.linkContract(line.id, contract.id, agreedQty, agreedPrice)
      onCreated(contract.id)
    } catch (err: any) {
      setError(err?.message || 'Error al crear el contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Crear contrato de ajuste">
      <div className="space-y-4">
        {/* Datos del presupuesto */}
        <div className="bg-app-bg border border-app-border rounded-lg p-3 text-xs space-y-1">
          <p className="font-medium text-app-text">{line.description}</p>
          <p className="text-app-muted">
            {line.unit} · Pres: {line.budgeted_quantity} × {formatRD(line.budgeted_unit_price)} = <span className="font-semibold text-app-text">{formatRD(budgetedTotal)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Contratista *</label>
            <select value={form.contractor_id} onChange={(e) => setForm({ ...form, contractor_id: e.target.value })} className={inputCls} required>
              <option value="">Seleccionar...</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}{c.specialty ? ` — ${c.specialty}` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cantidad acordada</label>
              <input type="number" step="any" min="0" value={form.agreed_quantity}
                onChange={(e) => setForm({ ...form, agreed_quantity: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Precio acordado (RD$)</label>
              <input type="number" step="any" min="0" value={form.agreed_unit_price}
                onChange={(e) => setForm({ ...form, agreed_unit_price: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Desvío vs presupuesto */}
          {(agreedQty > 0 || agreedPrice > 0) && (
            <div className={`rounded-lg p-2.5 text-xs flex items-center justify-between ${deviation > 0 ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'}`}>
              <span>Total acordado: <strong>{formatRD(agreedTotal)}</strong></span>
              <span>{deviation >= 0 ? '+' : ''}{formatRD(deviation)} ({deviationPct >= 0 ? '+' : ''}{deviationPct.toFixed(1)}% vs pres.)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Retención (%)</label>
              <input type="number" step="0.5" min="0" max="20" value={form.retention_percent}
                onChange={(e) => setForm({ ...form, retention_percent: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha de firma</label>
              <input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alcance del contrato..." className={inputCls} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
