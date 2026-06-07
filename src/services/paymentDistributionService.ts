import { supabase } from '@/lib/supabase'
import type { PaymentDistribution } from '@/types/database'
import { approvalsService } from '@/services/approvalsService'
import { round2 } from '@/utils/money'

/** Beneficiario seleccionable (contratista o proveedor) con sus datos bancarios. */
export interface Beneficiary {
  id: string
  type: 'contractor' | 'supplier'
  name: string
  bank_name: string | null
  bank_account: string | null
  /** Documento de identidad: cédula (contratista) o RNC (proveedor). */
  doc: string | null
  /** Solo aplica a contratistas; permite preseleccionar el método de pago. */
  payment_method: 'cash' | 'check' | 'transfer' | null
}

export const paymentDistributionService = {
  async getByPeriod(periodId: string): Promise<PaymentDistribution[]> {
    const { data, error } = await supabase.from('payment_distributions').select('*').eq('payroll_period_id', periodId)
    if (error) throw error
    return data as PaymentDistribution[]
  },

  /** Contratistas y proveedores con sus datos bancarios, para distribuir pagos. */
  async getBeneficiaries(): Promise<Beneficiary[]> {
    const [contractorsRes, suppliersRes] = await Promise.all([
      supabase.from('contractors').select('id, name, bank_name, bank_account, payment_method, cedula').order('name'),
      supabase.from('suppliers').select('id, name, bank_name, bank_account, rnc').order('name'),
    ])
    if (contractorsRes.error) throw contractorsRes.error
    if (suppliersRes.error) throw suppliersRes.error

    const contractors: Beneficiary[] = (contractorsRes.data || []).map((c) => ({
      id: c.id,
      type: 'contractor',
      name: c.name,
      bank_name: c.bank_name ?? null,
      bank_account: c.bank_account ?? null,
      doc: c.cedula ?? null,
      payment_method: c.payment_method ?? null,
    }))
    const suppliers: Beneficiary[] = (suppliersRes.data || []).map((s) => ({
      id: s.id,
      type: 'supplier',
      name: s.name,
      bank_name: s.bank_name ?? null,
      bank_account: s.bank_account ?? null,
      doc: s.rnc ?? null,
      payment_method: null,
    }))
    return [...contractors, ...suppliers]
  },

  async create(dist: Omit<PaymentDistribution, 'id'>, periodGrandTotal?: number): Promise<PaymentDistribution> {
    const amount = round2(dist.amount)
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor que cero.')
    }

    if (periodGrandTotal !== undefined) {
      const current = await this.getByPeriod(dist.payroll_period_id)
      // A7: exclude cancelled rows from the cap check
      const currentTotal = current.filter((row) => row.status !== 'cancelled').reduce((sum, row) => sum + row.amount, 0)
      if (currentTotal + amount > periodGrandTotal + 0.0001) {
        throw new Error('El monto excede el total pendiente por distribuir.')
      }
    }

    const { data, error } = await supabase
      .from('payment_distributions')
      .insert({ ...dist, amount })
      .select('*')
      .single()
    if (error) throw error

    const created = data as PaymentDistribution
    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: created.id,
        action: 'create',
        payload_after: created,
      })
      .catch((err) => console.warn('[paymentDistributionService.create] log de auditoria fallo', err))

    return created
  },

  /**
   * Consolida un pago en otro existente del mismo beneficiario sumando su monto.
   * Conserva el método, la cuenta de origen y demás datos del pago original; solo
   * incrementa el importe. Devuelve la fila actualizada.
   *
   * Usa el RPC `rpc_increment_payment_amount` para que el incremento y la
   * verificación del tope del período ocurran en una sola transacción atómica
   * con FOR UPDATE, eliminando la condición de carrera leer-luego-escribir.
   *
   * @param periodGrandTotal — cuando se pasa, el RPC valida que la suma de todos
   *   los pagos no cancelados del período no supere este tope.
   */
  async addAmount(id: string, delta: number, periodGrandTotal?: number): Promise<PaymentDistribution> {
    const roundedDelta = round2(delta)
    if (roundedDelta <= 0) {
      throw new Error('El monto a sumar debe ser mayor que cero.')
    }

    // Leer el estado previo SOLO para el log de auditoría; el RPC hace la
    // verificación real de forma atómica con FOR UPDATE.
    const { data: before, error: readError } = await supabase
      .from('payment_distributions')
      .select('*')
      .eq('id', id)
      .single()
    if (readError) throw readError
    if (!before) throw new Error('No se encontró el pago a consolidar.')

    const previous = before as PaymentDistribution

    // Llamada atómica: bloquea la fila con FOR UPDATE, verifica el tope del
    // período y aplica el incremento, todo en la misma transacción de Postgres.
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('rpc_increment_payment_amount', {
      p_id: id,
      p_delta: roundedDelta,
      p_period_cap: periodGrandTotal ?? null,
    })

    if (rpcErr) {
      const msg: string = (rpcErr as { message?: string }).message ?? ''
      if (msg.startsWith('EXCEEDS_PERIOD_CAP')) {
        throw new Error('El monto excede el total pendiente por distribuir.')
      }
      if (msg.startsWith('PAYMENT_NOT_FOUND')) {
        throw new Error('No se encontró el pago a consolidar.')
      }
      if (msg.startsWith('DELTA_NOT_POSITIVE')) {
        throw new Error('El monto a sumar debe ser mayor que cero.')
      }
      throw rpcErr
    }

    const updated = (typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult) as PaymentDistribution

    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: id,
        action: 'update',
        payload_before: { amount: previous.amount },
        payload_after: { amount: updated.amount },
      })
      .catch((err) => console.warn('[paymentDistributionService.addAmount] log de auditoria fallo', err))

    return updated
  },

  async updateStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): Promise<void> {
    const { data: before } = await supabase.from('payment_distributions').select('id, status').eq('id', id).single()

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('payment_distributions').update(updates).eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: id,
        action: 'status_change',
        payload_before: before ? { status: before.status } : null,
        payload_after: { status },
      })
      .catch((err) => console.warn('[paymentDistributionService.updateStatus] log de auditoria fallo', err))
  },

  async delete(id: string): Promise<void> {
    const { data: existing } = await supabase.from('payment_distributions').select('*').eq('id', id).single()

    const { error } = await supabase.from('payment_distributions').delete().eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: id,
        action: 'delete',
        payload_before: existing,
      })
      .catch((err) => console.warn('[paymentDistributionService.delete] log de auditoria fallo', err))
  },
}
