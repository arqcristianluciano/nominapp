import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Paperclip, Trash2, Download, Upload, File } from 'lucide-react'
import { projectDocumentService, PROJECT_DOC_TYPES, validateDocumentFile } from '@/services/projectDocumentService'
import type { ProjectDocument, ProjectDocumentType } from '@/types/database'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'

interface Props {
  projectId: string
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function docTypeLabel(type: ProjectDocumentType | null): string {
  if (!type) return '—'
  return PROJECT_DOC_TYPES.find((t) => t.value === type)?.label ?? type
}

export function ProjectDocumentsSection({ projectId }: Props) {
  const { success, error: toastError } = useToast()

  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDoc, setConfirmDoc] = useState<ProjectDocument | null>(null)
  const [selectedType, setSelectedType] = useState<ProjectDocumentType | ''>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const data = await projectDocumentService.listByProject(projectId)
      setDocs(data)
    } catch {
      toastError('No se pudieron cargar los documentos del proyecto.')
    } finally {
      setLoading(false)
    }
  }, [projectId, toastError])

  useEffect(() => {
    load()
  }, [load])

  // ── Subida de archivo ──────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    try {
      validateDocumentFile(file)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Archivo no válido.')
      return
    }

    setUploading(true)
    try {
      await projectDocumentService.upload(projectId, file, {
        docType: selectedType || undefined,
        displayName: file.name,
      })
      success('Documento subido correctamente.')
      setSelectedType('')
      await load()
    } catch {
      toastError('No se pudo subir el documento. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  // ── Descarga / vista ───────────────────────────────────────────────────────

  async function handleView(doc: ProjectDocument) {
    try {
      const url = await projectDocumentService.getSignedUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toastError('No se pudo generar el enlace de descarga.')
    }
  }

  // ── Eliminación ────────────────────────────────────────────────────────────

  async function handleDelete(doc: ProjectDocument) {
    setDeletingId(doc.id)
    try {
      await projectDocumentService.delete(doc.id, doc.storage_path)
      success('Documento eliminado.')
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch {
      toastError('No se pudo eliminar el documento. Intenta de nuevo.')
    } finally {
      setDeletingId(null)
      setConfirmDoc(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section aria-labelledby="project-docs-title">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 id="project-docs-title" className="text-lg font-medium text-app-text flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-app-muted" aria-hidden="true" />
          Documentos del proyecto
        </h2>

        {/* Controles de subida */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ProjectDocumentType | '')}
            className="text-sm border border-app-border rounded-lg px-3 py-1.5 bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Categoría del documento"
          >
            <option value="">Sin categoría</option>
            {PROJECT_DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            {uploading ? 'Subiendo…' : 'Subir archivo'}
          </button>

          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.zip"
            onChange={handleFileChange}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Lista de documentos */}
      {loading ? (
        <p className="text-sm text-app-muted py-4 text-center">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <div className="bg-app-surface border border-app-border rounded-xl p-6 text-center space-y-1">
          <File className="w-8 h-8 text-app-muted mx-auto" aria-hidden="true" />
          <p className="text-sm text-app-muted">Aún no hay documentos. Usa el botón para subir el primero.</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden sm:block bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-app-border bg-app-hover">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-app-muted">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-app-muted">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-app-muted">Tamaño</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-app-muted">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-app-muted">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-app-border last:border-0 hover:bg-app-hover">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-app-muted shrink-0" aria-hidden="true" />
                        <span className="text-sm text-app-text truncate max-w-[220px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-app-muted whitespace-nowrap">
                      {docTypeLabel(doc.doc_type)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-app-muted whitespace-nowrap">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-app-muted whitespace-nowrap">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(doc)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          title="Ver / descargar"
                          aria-label={`Ver o descargar ${doc.name}`}
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDoc(doc)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                          title="Eliminar documento"
                          aria-label={`Eliminar ${doc.name}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="bg-app-surface rounded-xl border border-app-border p-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-app-muted shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-app-text font-medium break-words">{doc.name}</p>
                    <p className="text-xs text-app-muted mt-0.5">
                      {docTypeLabel(doc.doc_type)}
                      {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}
                      {` · ${formatDate(doc.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleView(doc)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] flex items-center justify-center"
                      aria-label={`Ver o descargar ${doc.name}`}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDoc(doc)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] flex items-center justify-center"
                      aria-label={`Eliminar ${doc.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        open={!!confirmDoc}
        title="Eliminar documento"
        message={`¿Seguro que quieres eliminar "${confirmDoc?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDoc) handleDelete(confirmDoc)
        }}
        onCancel={() => setConfirmDoc(null)}
      />
    </section>
  )
}
