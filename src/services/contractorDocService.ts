import { supabase } from '@/lib/supabase'

export type DocStatus = 'valid' | 'expiring' | 'expired' | 'missing'

export interface ContractorDocument {
  id: string
  contractor_id: string
  doc_type: string
  name: string
  file_ref: string | null
  expiry_date: string | null
  status: DocStatus
  notes: string | null
  created_at: string
}

export type ContractorDocFormData = Omit<ContractorDocument, 'id' | 'created_at'>

const DOC_TYPES = [
  { value: 'cedula',    label: 'Cédula de identidad' },
  { value: 'seguro',    label: 'Seguro riesgos laborales' },
  { value: 'contrato',  label: 'Contrato de servicios' },
  { value: 'licencia',  label: 'Licencia profesional (CODIA)' },
  { value: 'poliza',    label: 'Póliza de seguro' },
  { value: 'otro',      label: 'Otro documento' },
]

export { DOC_TYPES }

export const contractorDocService = {
  async getByContractor(contractorId: string): Promise<ContractorDocument[]> {
    const { data, error } = await supabase
      .from('contractor_documents')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('doc_type', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(doc: ContractorDocFormData): Promise<ContractorDocument> {
    const status = computeStatus(doc.expiry_date)
    const { data, error } = await supabase
      .from('contractor_documents')
      .insert({ ...doc, status, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, doc: Partial<ContractorDocFormData>): Promise<void> {
    const patch: Record<string, unknown> = { ...doc }
    if (doc.expiry_date !== undefined) patch.status = computeStatus(doc.expiry_date)
    const { error } = await supabase.from('contractor_documents').update(patch).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contractor_documents').delete().eq('id', id)
    if (error) throw error
  },

  async getAllExpiring(): Promise<ContractorDocument[]> {
    const { data, error } = await supabase.from('contractor_documents').select('*')
    if (error) return []
    return (data ?? []).filter((d) => d.status === 'expiring' || d.status === 'expired')
  },
}

function computeStatus(expiryDate: string | null): DocStatus {
  if (!expiryDate) return 'valid'
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring'
  return 'valid'
}
