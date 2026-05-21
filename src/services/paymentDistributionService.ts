import { supabase } from '@/lib/supabase'
import type { PaymentDistribution, BankAccount } from '@/types/database'
import { approvalsService } from '@/services/approvalsService'

export type DistributionWithAccount = PaymentDistribution & { bank_account?: BankAccount }

export const paymentDistributionService = {
  async getByPeriod(periodId: string): Promise<DistributionWithAccount[]> {
    const { data, error } = await supabase
      .from('payment_distributions')
      .select('*, bank_account:bank_accounts(*)')
      .eq('payroll_period_id', periodId)
    if (error) throw error
    return data as DistributionWithAccount[]
  },

  async create(
    dist: Omit<PaymentDistribution, 'id'>,
    periodGrandTotal?: number,
  ): Promise<DistributionWithAccount> {
    if (dist.amount <= 0) {
      throw new Error('El monto debe ser mayor que cero.')
    }

    if (periodGrandTotal !== undefined) {
      const current = await this.getByPeriod(dist.payroll_period_id)
      const currentTotal = current.reduce((sum, row) => sum + row.amount, 0)
      if (currentTotal + dist.amount > periodGrandTotal + 0.0001) {
        throw new Error('El monto excede el total pendiente por distribuir.')
      }
    }

    const { data, error } = await supabase
      .from('payment_distributions')
      .insert(dist)
      .select('*, bank_account:bank_accounts(*)')
      .single()
    if (error) throw error

    const created = data as DistributionWithAccount
    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: created.id,
        action: 'create',
        payload_after: created,
      })
      .catch((err) =>
        console.warn('[paymentDistributionService.create] log de auditoria fallo', err),
      )

    return created
  },

  async updateStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): Promise<void> {
    const { data: before } = await supabase
      .from('payment_distributions')
      .select('id, status')
      .eq('id', id)
      .single()

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase
      .from('payment_distributions')
      .update(updates)
      .eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: id,
        action: 'status_change',
        payload_before: before ? { status: before.status } : null,
        payload_after: { status },
      })
      .catch((err) =>
        console.warn('[paymentDistributionService.updateStatus] log de auditoria fallo', err),
      )
  },

  async delete(id: string): Promise<void> {
    const { data: existing } = await supabase
      .from('payment_distributions')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('payment_distributions')
      .delete()
      .eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payment_distribution',
        entity_id: id,
        action: 'delete',
        payload_before: existing,
      })
      .catch((err) =>
        console.warn('[paymentDistributionService.delete] log de auditoria fallo', err),
      )
  },
}
