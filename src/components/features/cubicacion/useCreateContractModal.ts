import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contractService } from '@/services/cubicationService'
import { parseDecimalInput } from '@/utils/decimalInput'
import { getErrorMessage } from '@/utils/errors'

export interface CreateContractFormState {
  contractor_id: string
  retention_percent: string
  signed_date: string
  notes: string
}

const INITIAL_FORM: CreateContractFormState = {
  contractor_id: '',
  retention_percent: '5',
  signed_date: '',
  notes: '',
}

const CREATE_ERROR_FALLBACK =
  'Error al crear el contrato. Verifica que las tablas del módulo de cubicación existan en Supabase.'

interface SubmitCreateContractParams {
  event: React.FormEvent
  projectId: string | undefined
  form: CreateContractFormState
  navigate: ReturnType<typeof useNavigate>
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>
  setForm: React.Dispatch<React.SetStateAction<CreateContractFormState>>
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
  setFormError: React.Dispatch<React.SetStateAction<string | null>>
}

async function submitCreateContract({
  event,
  projectId,
  form,
  navigate,
  setShowForm,
  setForm,
  setSaving,
  setFormError,
}: SubmitCreateContractParams) {
  event.preventDefault()
  if (!projectId) {
    setFormError('Proyecto inválido para crear contrato.')
    return
  }
  const retentionPercent = parseDecimalInput(form.retention_percent) ?? 0
  if (retentionPercent < 0 || retentionPercent > 100) {
    setFormError('La retención debe estar entre 0 y 100%.')
    return
  }
  setSaving(true)
  setFormError(null)
  try {
    const created = await contractService.create({
      project_id: projectId,
      contractor_id: form.contractor_id,
      retention_percent: retentionPercent,
      signed_date: form.signed_date || null,
      notes: form.notes || null,
    })
    setShowForm(false)
    setForm(INITIAL_FORM)
    navigate(`/proyectos/${projectId}/cubicaciones/${created.id}`)
  } catch (error) {
    setFormError(getErrorMessage(error) || CREATE_ERROR_FALLBACK)
  } finally {
    setSaving(false)
  }
}

export function useCreateContractModal(projectId: string | undefined) {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateContractFormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreateContract = useCallback(
    async (event: React.FormEvent) => {
      await submitCreateContract({
        event,
        projectId,
        form,
        navigate,
        setShowForm,
        setForm,
        setSaving,
        setFormError,
      })
    },
    [form, navigate, projectId],
  )

  return {
    showForm,
    form,
    saving,
    formError,
    setForm,
    openCreateModal: () => {
      setShowForm(true)
      setFormError(null)
    },
    closeCreateModal: () => {
      setShowForm(false)
      setFormError(null)
    },
    handleCreateContract,
  }
}
