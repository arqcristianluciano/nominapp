import { supabase } from '@/lib/supabase'
import type { PaymentDistribution, BankAccount } from '@/types/database'

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

  async create(dist: Omit<PaymentDistribution, 'id'>): Promise<DistributionWithAccount> {
    const { data, error } = await supabase
      .from('payment_distributions')
      .insert(dist)
      .select('*, bank_account:bank_accounts(*)')
      .single()
    if (error) throw error
    return data as DistributionWithAccount
  },

  async updateStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): Promise<void> {
    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase
      .from('payment_distributions')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_distributions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
