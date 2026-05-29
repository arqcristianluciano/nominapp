import { FileText } from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { useToast } from '@/components/ui/Toast'

// Lista los conduces (notas de entrega) adjuntados en las recepciones de la OC.
// Abre cada uno con una URL firmada temporal del bucket privado.
export function ReceiptConducesCard({ paths }: { paths: string[] }) {
  const { error } = useToast()
  if (paths.length === 0) return null

  async function open(path: string) {
    try {
      const url = await inventoryService.getReceiptAttachmentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      error('No se pudo abrir el conduce')
    }
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-4">
      <p className="text-sm font-semibold text-app-text mb-2">Conduces / notas de entrega</p>
      <ul className="space-y-1.5">
        {paths.map((p, i) => (
          <li key={p}>
            <button
              onClick={() => open(p)}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileText className="w-4 h-4" /> Ver conduce{paths.length > 1 ? ` ${i + 1}` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
