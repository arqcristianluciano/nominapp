import { supabase } from '@/lib/supabase'
import { approvalsService } from '@/services/approvalsService'
import { div, mul, pct, round2, sub, sumBy } from '@/utils/money'
import type {
  AdjustmentContract,
  ContractPartida,
  ContractCorte,
  ContractAdelanto,
  CorteStatus,
} from '@/types/database'

export type ContractWithContractor = AdjustmentContract & {
  partidas?: ContractPartida[]
  cortes?: ContractCorte[]
  adelantos?: ContractAdelanto[]
}

export type ContractSummary = AdjustmentContract & {
  partidas_count: number
  acordado: number
  acumulado: number
  retenido: number
  total_adelantos: number
  pendiente: number
  completion_percent: number
}

function computeSummary(
  partidas: ContractPartida[],
  cortes: ContractCorte[],
  adelantos: ContractAdelanto[] = [],
): Omit<ContractSummary, keyof AdjustmentContract> {
  const acordado = round2(sumBy(partidas, (p) => mul(p.agreed_quantity, p.unit_price)))
  const acumulado = round2(sumBy(cortes, (c) => c.amount))
  const retenido = round2(sumBy(cortes, (c) => c.retention_amount))
  const total_adelantos = round2(sumBy(adelantos, (a) => a.amount))
  const pendienteRaw = round2(sub(sub(acordado, acumulado), total_adelantos))
  return {
    partidas_count: partidas.length,
    acordado,
    acumulado,
    retenido,
    total_adelantos,
    pendiente: pendienteRaw < 0 ? 0 : pendienteRaw,
    completion_percent: acordado > 0 ? Math.min(round2(mul(div(acumulado, acordado), 100)), 100) : 0,
  }
}

// --- Contratos ---

export const contractService = {
  async getByProject(projectId: string): Promise<ContractSummary[]> {
    const { data: contracts, error } = await supabase
      .from('adjustment_contracts')
      .select('*, contractor:contractors(*)')
      .eq('project_id', projectId)
      .order('created_at')
    if (error) throw error

    return Promise.all(
      (contracts as AdjustmentContract[]).map(async (c) => {
        const [partidas, cortes, adelantos] = await Promise.all([
          partidaService.getByContract(c.id),
          corteService.getByContract(c.id),
          adelantoService.getByContract(c.id),
        ])
        return { ...c, ...computeSummary(partidas, cortes, adelantos) }
      })
    )
  },

  async getById(id: string): Promise<ContractWithContractor> {
    const { data, error } = await supabase
      .from('adjustment_contracts')
      .select('*, contractor:contractors(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    const [partidas, cortes, adelantos] = await Promise.all([
      partidaService.getByContract(id),
      corteService.getByContract(id),
      adelantoService.getByContract(id),
    ])
    return { ...(data as AdjustmentContract), partidas, cortes, adelantos }
  },

  async create(data: Omit<AdjustmentContract, 'id' | 'created_at' | 'contractor'>): Promise<AdjustmentContract> {
    const { data: row, error } = await supabase
      .from('adjustment_contracts')
      .insert(data)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return row as AdjustmentContract
  },

  async update(id: string, data: Partial<Omit<AdjustmentContract, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await supabase.from('adjustment_contracts').update(data).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('adjustment_contracts').delete().eq('id', id)
    if (error) throw error
  },
}

// --- Partidas ---

export const partidaService = {
  async getByContract(contractId: string): Promise<ContractPartida[]> {
    const { data, error } = await supabase
      .from('contract_partidas')
      .select('*')
      .eq('contract_id', contractId)
      .order('sort_order')
    if (error) throw error
    return data as ContractPartida[]
  },

  async create(data: Omit<ContractPartida, 'id'>): Promise<ContractPartida> {
    const { data: row, error } = await supabase.from('contract_partidas').insert(data).select().single()
    if (error) throw error
    return row as ContractPartida
  },

  async update(id: string, data: Partial<Omit<ContractPartida, 'id'>>): Promise<void> {
    const { error } = await supabase.from('contract_partidas').update(data).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contract_partidas').delete().eq('id', id)
    if (error) throw error
  },
}

// --- Cortes ---

export const corteService = {
  async getByContract(contractId: string): Promise<ContractCorte[]> {
    const { data, error } = await supabase
      .from('contract_cortes')
      .select('*, partida:contract_partidas(*)')
      .eq('contract_id', contractId)
      .order('cut_number')
    if (error) throw error
    return data as ContractCorte[]
  },

  async getPendingApproved(): Promise<(ContractCorte & { contract?: AdjustmentContract })[]> {
    const { data, error } = await supabase
      .from('contract_cortes')
      .select('*, partida:contract_partidas(*), contract:adjustment_contracts(*, contractor:contractors(*))')
      .eq('status', 'approved')
    if (error) throw error
    return data as (ContractCorte & { contract?: AdjustmentContract })[]
  },

  async create(
    data: Omit<ContractCorte, 'id' | 'created_at' | 'amount' | 'retention_amount' | 'partida' | 'approved_by' | 'signature_data' | 'linked_payroll_id'>,
    partida: ContractPartida,
    retentionPct: number,
  ): Promise<ContractCorte> {
    const amount = round2(mul(data.measured_quantity, partida.unit_price))
    const retention_amount = round2(pct(amount, retentionPct))
    const { data: row, error } = await supabase
      .from('contract_cortes')
      .insert({ ...data, amount, retention_amount, approved_by: null, signature_data: null, linked_payroll_id: null })
      .select('*, partida:contract_partidas(*)')
      .single()
    if (error) throw error
    return row as ContractCorte
  },

  async approve(id: string, approvedBy: string, signatureData: string): Promise<void> {
    const { error } = await supabase
      .from('contract_cortes')
      .update({ status: 'approved', approved_by: approvedBy, signature_data: signatureData })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'contract_corte',
      entity_id: id,
      action: 'approve',
      actor_display_name: approvedBy,
      payload_after: { approved_by: approvedBy, signature_data: signatureData },
    })
  },

  async linkToPayroll(id: string, payrollPeriodId: string): Promise<void> {
    const { error } = await supabase
      .from('contract_cortes')
      .update({ status: 'paid', linked_payroll_id: payrollPeriodId })
      .eq('id', id)
    if (error) throw error
  },

  async updateStatus(id: string, status: CorteStatus): Promise<void> {
    const { error } = await supabase.from('contract_cortes').update({ status }).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contract_cortes').delete().eq('id', id)
    if (error) throw error
  },

  async unlinkFromPayroll(id: string): Promise<void> {
    const { error } = await supabase
      .from('contract_cortes')
      .update({ status: 'approved', linked_payroll_id: null })
      .eq('id', id)
    if (error) throw error
  },
}

// --- Progreso por proyecto (para Dashboard) ---

export async function getProjectsProgress(): Promise<Record<string, { acordado: number; acumulado: number; contractor_count: number; avg_completion: number }>> {
  const { data: contracts } = await supabase.from('adjustment_contracts').select('id, project_id')
  const { data: partidas } = await supabase.from('contract_partidas').select('contract_id, unit_price, agreed_quantity')
  const { data: cortes } = await supabase.from('contract_cortes').select('contract_id, amount')
  if (!contracts) return {}

  const result: Record<string, { acordado: number; acumulado: number; contractor_count: number; avg_completion: number }> = {}

  type ContractRow = { id: string; project_id: string }
  type PartidaRow = { contract_id: string; unit_price: number; agreed_quantity: number }
  type CorteRow = { contract_id: string; amount: number }

  const partidasArr = (partidas ?? []) as PartidaRow[]
  const cortesArr = (cortes ?? []) as CorteRow[]

  for (const contract of contracts as ContractRow[]) {
    const pid = contract.project_id
    if (!result[pid]) result[pid] = { acordado: 0, acumulado: 0, contractor_count: 0, avg_completion: 0 }
    result[pid].contractor_count += 1

    const cPartidas = partidasArr.filter((p) => p.contract_id === contract.id)
    const cCortes = cortesArr.filter((c) => c.contract_id === contract.id)
    result[pid].acordado += cPartidas.reduce((s, p) => s + p.unit_price * p.agreed_quantity, 0)
    result[pid].acumulado += cCortes.reduce((s, c) => s + c.amount, 0)
  }

  for (const pid of Object.keys(result)) {
    const g = result[pid]
    g.avg_completion = g.acordado > 0 ? Math.min((g.acumulado / g.acordado) * 100, 100) : 0
  }
  return result
}

export async function getCortesByPayroll(
  payrollId: string,
): Promise<(ContractCorte & { contract: AdjustmentContract | null })[]> {
  const { data: contracts } = await supabase
    .from('adjustment_contracts')
    .select('id, contractor_id, contractor:contractors(*)')
  const { data: cortes, error } = await supabase
    .from('contract_cortes')
    .select('*, partida:contract_partidas(*)')
    .eq('linked_payroll_id', payrollId)
  if (error) throw error
  return (cortes as ContractCorte[]).map((c) => ({
    ...c,
    contract: (contracts as AdjustmentContract[] | null)?.find((ac) => ac.id === c.contract_id) ?? null,
  }))
}

export async function getApprovedCortesByProject(
  projectId: string,
): Promise<(ContractCorte & { contract: AdjustmentContract | null })[]> {
  const { data: contracts } = await supabase
    .from('adjustment_contracts')
    .select('id, contractor_id, contractor:contractors(*)')
    .eq('project_id', projectId)
  if (!contracts?.length) return []
  const groups = await Promise.all(
    (contracts as unknown as AdjustmentContract[]).map(async (contract) => {
      const { data: cortes } = await supabase
        .from('contract_cortes')
        .select('*, partida:contract_partidas(*)')
        .eq('contract_id', contract.id)
        .eq('status', 'approved')
      return ((cortes as ContractCorte[]) || [])
        .filter((c) => !c.linked_payroll_id)
        .map((c) => ({ ...c, contract }))
    }),
  )
  return groups.flat()
}

// --- Adelantos ---

export const adelantoService = {
  async getByContract(contractId: string): Promise<ContractAdelanto[]> {
    const { data, error } = await supabase
      .from('contract_adelantos')
      .select('*')
      .eq('contract_id', contractId)
      .order('advance_date')
    if (error) throw error
    return data as ContractAdelanto[]
  },

  async create(data: Omit<ContractAdelanto, 'id' | 'created_at'>): Promise<ContractAdelanto> {
    const { data: row, error } = await supabase.from('contract_adelantos').insert(data).select().single()
    if (error) throw error
    return row as ContractAdelanto
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contract_adelantos').delete().eq('id', id)
    if (error) throw error
  },
}
