import { Modal } from '@/components/ui/Modal'
import type { Contractor } from '@/types/database'

interface FormState {
  contractor_id: string
  retention_percent: string
  signed_date: string
  notes: string
}

export function CreateContractModal({
  open,
  contractors,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean
  contractors: Contractor[]
  form: FormState
  saving: boolean
  error: string | null
  onChange: (next: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  const inputCls = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm bg-app-input-bg text-app-text focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <Modal open={open} onClose={onClose} title="Nuevo contrato de ajuste">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className={labelCls}>Contratista *</label><select value={form.contractor_id} onChange={(e) => onChange({ ...form, contractor_id: e.target.value })} className={inputCls} required><option value="">Seleccionar contratista...</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name} — {contractor.specialty}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Retención (%)</label><input type="text" inputMode="decimal" value={form.retention_percent} onChange={(e) => onChange({ ...form, retention_percent: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Fecha de firma</label><input type="date" value={form.signed_date} onChange={(e) => onChange({ ...form, signed_date: e.target.value })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Notas</label><input value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} placeholder="Descripción del alcance..." className={inputCls} /></div>
        {error && <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creando...' : 'Crear contrato'}</button>
        </div>
      </form>
    </Modal>
  )
}
