import { ImageIcon } from 'lucide-react'

export function PurchaseOrderSignatureCard({
  signatureData,
  approvedAt,
}: {
  signatureData: string | null | undefined
  approvedAt: string | null | undefined
}) {
  if (!signatureData) return null

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-5">
      <p className="text-sm font-medium text-app-muted mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" /> Firma digital
        {approvedAt && <span className="text-xs text-app-subtle font-normal">— {new Date(approvedAt).toLocaleString('es-DO')}</span>}
      </p>
      <img src={signatureData} alt="Firma digital" className="max-h-32 border border-app-border rounded-lg bg-app-bg" />
    </div>
  )
}
