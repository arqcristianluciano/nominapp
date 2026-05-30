import { useEffect, useRef, useState } from 'react'
import { Upload, Download, Trash2, FileText, RefreshCw } from 'lucide-react'
import { userDocumentsService, type UserDocument, type UserDocumentType } from '@/services/userDocumentsService'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

interface Props {
  userId: string
}

const DOC_TYPES: { value: UserDocumentType; label: string }[] = [
  { value: 'cedula', label: 'Cédula' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'contract', label: 'Contrato' },
  { value: 'other', label: 'Otro' },
]

const TYPE_LABELS: Record<UserDocumentType, string> = {
  cedula: 'Cédula',
  passport: 'Pasaporte',
  contract: 'Contrato',
  other: 'Otro',
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return iso
  }
}

function getDocName(doc: UserDocument): string {
  if (doc.display_name && doc.display_name.trim()) return doc.display_name
  const parts = doc.file_path.split('/')
  return parts[parts.length - 1] ?? doc.file_path
}

export function UserDocumentsSection({ userId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<UserDocumentType>('cedula')
  const { success, error: toastError } = useToast()

  async function loadDocs() {
    setLoading(true)
    try {
      const data = await userDocumentsService.list(userId)
      setDocs(data)
    } catch (e) {
      toastError(getErrorMessage(e) || 'No se pudieron cargar los documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      void loadDocs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true)
    try {
      await userDocumentsService.upload(userId, file, docType)
      success('Documento subido correctamente')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      await loadDocs()
    } catch (e) {
      toastError(getErrorMessage(e) || 'No se pudo subir el documento')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: UserDocument) {
    try {
      const url = await userDocumentsService.getDownloadUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(getErrorMessage(e) || 'No se pudo descargar el documento')
    }
  }

  async function handleDelete(doc: UserDocument) {
    if (deletingId) return
    const name = getDocName(doc)
    if (!window.confirm(`¿Eliminar el documento "${name}"?`)) return
    setDeletingId(doc.id)
    try {
      await userDocumentsService.delete(doc.id, doc.file_path)
      success('Documento eliminado')
      await loadDocs()
    } catch (e) {
      toastError(getErrorMessage(e) || 'No se pudo eliminar el documento')
    } finally {
      setDeletingId(null)
    }
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">Subir documento</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <input
            ref={inputRef}
            type="file"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={
              inputCls +
              ' file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-app-hover file:text-app-muted file:font-medium'
            }
          />
          <select
            value={docType}
            disabled={uploading}
            onChange={(e) => setDocType(e.target.value as UserDocumentType)}
            className={inputCls}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            aria-busy={uploading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 justify-center"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-app-border bg-app-bg">
          <div className="text-xs font-bold uppercase tracking-wide text-app-subtle">Documentos ({docs.length})</div>
          <button
            type="button"
            onClick={() => void loadDocs()}
            disabled={loading}
            className="text-xs text-app-subtle hover:text-app-muted flex items-center gap-1 disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        {loading && docs.length === 0 ? (
          <div className="p-8 text-center text-sm text-app-muted">Cargando documentos...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-app-subtle mx-auto mb-2" />
            <p className="text-sm text-app-muted">No hay documentos cargados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-app-muted text-xs">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-app-muted text-xs">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium text-app-muted text-xs hidden sm:table-cell">Fecha</th>
                  <th className="px-2 py-2 text-right font-medium text-app-muted text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {docs.map((doc) => {
                  const name = getDocName(doc)
                  return (
                    <tr key={doc.id} className="hover:bg-app-hover group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-app-subtle shrink-0" />
                          <span className="font-medium text-app-text truncate" title={name}>
                            {name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-app-chip text-app-muted">
                          {TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-app-muted text-xs hidden sm:table-cell">
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleDownload(doc)}
                          className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded-lg text-app-subtle hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
