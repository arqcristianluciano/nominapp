import { useState } from 'react'
import { CheckCircle, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SignatureCanvas } from '@/components/features/purchase-orders/SignatureCanvas'
import { approvalCode } from '@/utils/approvalCode'

interface Props {
  open: boolean
  onClose: () => void
  corteNum: number
  amount: number
  onApprove: (approvedBy: string, signature: string) => Promise<void>
}

export function CorteApprovalModal({ open, onClose, corteNum, amount, onApprove }: Props) {
  const [code, setCode] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCode(''); setApprovedBy(''); setSignature(null); setError(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleApprove() {
    if (!approvalCode.validate(code)) { setError('Código de aprobación incorrecto'); return }
    if (!approvedBy.trim()) { setError('Ingrese su nombre'); return }
    if (!signature) { setError('Se requiere la firma digital'); return }
    setLoading(true)
    setError(null)
    try {
      await onApprove(approvedBy.trim(), signature)
      reset()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })

  return (
    <Modal open={open} onClose={handleClose} title={`Aprobar corte #${corteNum}`}>
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
          Monto del corte: <strong>{fmt(amount)}</strong>
        </div>

        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Código de aprobación personal</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} type="password"
            placeholder="Su código personal"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-input-bg text-app-text" />
          <p className="text-[10px] text-app-subtle mt-1">En modo demo el código es: 1234</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Aprobado por</label>
          <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}
            placeholder="Su nombre completo"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-input-bg text-app-text" />
        </div>

        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Firma digital</label>
          <SignatureCanvas onChange={setSignature} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleApprove} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          <CheckCircle className="w-4 h-4" />
          {loading ? 'Aprobando...' : 'Confirmar aprobación'}
        </button>

        <p className="text-xs text-app-subtle flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          La aprobación queda registrada con nombre, firma y fecha
        </p>
      </div>
    </Modal>
  )
}
