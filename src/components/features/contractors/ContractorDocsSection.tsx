import { useState } from 'react'
import { FileCheck, Plus, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import {
  contractorDocService,
  DOC_TYPES,
  type ContractorDocument,
  type ContractorDocFormData,
} from '@/services/contractorDocService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

interface Props {
  contractorId: string
  docs: ContractorDocument[]
  onChange: (docs: ContractorDocument[]) => void
}

type DocForm = Omit<ContractorDocFormData, 'contractor_id' | 'status'>

const INITIAL_FORM: DocForm = {
  doc_type: 'cedula',
  name: '',
  file_ref: null,
  expiry_date: null,
  notes: null,
}

export function ContractorDocsSection({ contractorId, docs, onChange }: Props) {
  const { error: toastError } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<DocForm>(INITIAL_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await contractorDocService.create({ ...form, contractor_id: contractorId, status: 'valid' })
      setShowForm(false)
      setForm(INITIAL_FORM)
      onChange(await contractorDocService.getByContractor(contractorId))
    } catch (err) {
      console.warn('[ContractorDocsSection] handleSave failed', getErrorMessage(err))
      toastError('No se pudo guardar el documento. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    await contractorDocService.delete(deleteId)
    setDeleteId(null)
    onChange(await contractorDocService.getByContractor(contractorId))
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-app-text">Documentos</h3>
          {docs.some((d) => d.status === 'expired') && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 font-bold">
              Expirado
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>

      {showForm && (
        <DocFormPanel
          form={form}
          setForm={setForm}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {docs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-app-muted">Sin documentos registrados.</div>
      ) : (
        <DocsTable docs={docs} onDelete={setDeleteId} />
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar documento"
        message="¿Eliminar este documento del contratista?"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function DocFormPanel({
  form,
  setForm,
  onCancel,
  onSave,
  saving,
}: {
  form: DocForm
  setForm: (f: DocForm) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
}) {
  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-1 focus:ring-blue-500'
  return (
    <div className="px-4 py-3 border-b border-app-border bg-app-hover/30 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-app-muted block mb-1">Tipo</label>
          <select
            value={form.doc_type}
            onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
            className={inputClass}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Nombre / descripción *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Cédula de identidad"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Vencimiento</label>
          <input
            type="date"
            value={form.expiry_date ?? ''}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value || null })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          aria-busy={saving}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function DocsTable({ docs, onDelete }: { docs: ContractorDocument[]; onDelete: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-app-hover/50 text-xs text-app-muted">
          <th className="text-left px-4 py-2 font-medium">Documento</th>
          <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Tipo</th>
          <th className="text-center px-4 py-2 font-medium">Estado</th>
          <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Vencimiento</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-app-border">
        {docs.map((doc) => (
          <tr key={doc.id} className="hover:bg-app-hover/50">
            <td className="px-4 py-2.5 font-medium text-app-text text-sm">{doc.name}</td>
            <td className="px-4 py-2.5 text-app-muted text-xs hidden sm:table-cell">
              {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type}
            </td>
            <td className="px-4 py-2.5 text-center">
              <DocStatusBadge status={doc.status} />
            </td>
            <td className="px-4 py-2.5 text-app-muted text-xs hidden md:table-cell">
              {doc.expiry_date ?? 'Sin vencimiento'}
            </td>
            <td className="px-4 py-2.5">
              <button
                onClick={() => onDelete(doc.id)}
                className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DocStatusBadge({ status }: { status: ContractorDocument['status'] }) {
  if (status === 'valid')
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs">
        <CheckCircle className="w-3.5 h-3.5" />
        Vigente
      </span>
    )
  if (status === 'expiring')
    return (
      <span className="inline-flex items-center gap-1 text-yellow-600 text-xs">
        <Clock className="w-3.5 h-3.5" />
        Por vencer
      </span>
    )
  if (status === 'expired')
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
        <AlertTriangle className="w-3.5 h-3.5" />
        Vencido
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-app-muted text-xs">
      <AlertTriangle className="w-3.5 h-3.5" />
      Faltante
    </span>
  )
}
