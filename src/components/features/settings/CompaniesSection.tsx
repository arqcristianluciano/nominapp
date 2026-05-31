import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CompanyForm } from '@/components/features/settings/CompanyForm'
import { CompaniesPanel } from '@/components/features/settings/SettingsPanels'
import { useAppRoles } from '@/hooks/useAppRoles'
import { useToast } from '@/components/ui/Toast'
import { companyService } from '@/services/companyService'
import { getErrorMessage } from '@/utils/errors'
import type { Company } from '@/types/database'

type CompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at'>

export function CompaniesSection() {
  const { isDirector } = useAppRoles()
  const { error } = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | undefined>()

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await companyService.getAll()
      setCompanies(data)
    } catch (loadError) {
      error(`No se pudieron cargar empresas: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void loadCompanies()
  }, [loadCompanies])

  const openCreate = useCallback(() => {
    setEditing(undefined)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((company: Company) => {
    setEditing(company)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditing(undefined)
  }, [])

  const saveCompany = useCallback(
    async (data: Partial<Company>) => {
      setSaving(true)
      try {
        if (editing) {
          await companyService.update(editing.id, data)
        } else {
          await companyService.create(data as CompanyInput)
        }
        closeForm()
        await loadCompanies()
      } catch (saveError) {
        error(`No se pudo guardar empresa: ${getErrorMessage(saveError)}`)
      } finally {
        setSaving(false)
      }
    },
    [closeForm, editing, error, loadCompanies],
  )

  if (!isDirector) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <p className="text-app-muted">No tienes permiso para administrar empresas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + Nueva empresa
        </button>
      </div>

      <CompaniesPanel loading={loading} companies={companies} onEdit={openEdit} />

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Editar empresa' : 'Nueva empresa'}>
        <CompanyForm initial={editing} saving={saving} onSubmit={saveCompany} onCancel={closeForm} />
      </Modal>
    </div>
  )
}
