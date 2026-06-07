import { supabase } from '@/lib/supabase'
import type { ContractorLoan, LoanDeduction, LoanFrecuencia, LoanInstallment, LoanStatus } from '@/types/database'
import { add, div, money, pct, round2 } from '@/utils/money'

/** Cuota fija: capital + interés simple distribuido en N cuotas */
export function calcInstallmentAmount(principal: number, interestRate: number, installments: number): number {
  if (installments <= 0) return 0
  const base = money(principal)
  const totalInterest = pct(base, interestRate)
  return round2(div(add(base, totalInterest), installments))
}

/** Calcula la fecha de una cuota a partir de la fecha de desembolso, frecuencia y número de cuota. */
export function calcInstallmentDate(disbursedDate: string, frecuencia: LoanFrecuencia, numeroCuota: number): string {
  const base = new Date(disbursedDate + 'T00:00:00')
  if (frecuencia === 'semanal') {
    base.setDate(base.getDate() + numeroCuota * 7)
  } else if (frecuencia === 'quincenal') {
    base.setDate(base.getDate() + numeroCuota * 15)
  } else {
    // mensual: suma meses exactos
    base.setMonth(base.getMonth() + numeroCuota)
  }
  return base.toISOString().slice(0, 10)
}

/** Genera el array de cuotas a insertar para un préstamo recién creado. */
function buildInstallments(
  loanId: string,
  disbursedDate: string,
  frecuencia: LoanFrecuencia,
  installments: number,
  installmentAmount: number,
): Array<{
  loan_id: string
  numero_cuota: number
  fecha_pago_programada: string
  monto: number
}> {
  return Array.from({ length: installments }, (_, idx) => ({
    loan_id: loanId,
    numero_cuota: idx + 1,
    fecha_pago_programada: calcInstallmentDate(disbursedDate, frecuencia, idx + 1),
    monto: installmentAmount,
  }))
}

export const loanService = {
  /** Lista todos los préstamos a contratistas con su contratista relacionado. */
  async getAll(): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

  /** Lista los préstamos de un contratista específico. */
  async getByContractor(contractorId: string): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

  /** Crea un préstamo nuevo calculando la cuota, iniciándolo en estado activo y
   *  generando el cronograma de cuotas según la frecuencia indicada. */
  async create(loan: {
    contractor_id: string
    principal: number
    interest_rate: number
    installments: number
    disbursed_date: string
    frecuencia?: LoanFrecuencia
    disbursement_account_id?: string | null
    notes?: string
  }): Promise<ContractorLoan> {
    const frecuencia: LoanFrecuencia = loan.frecuencia ?? 'mensual'
    const installment_amount = calcInstallmentAmount(loan.principal, loan.interest_rate, loan.installments)

    const { data, error } = await supabase
      .from('contractor_loans')
      .insert({ ...loan, frecuencia, installment_amount, status: 'active' })
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    const created = data as ContractorLoan

    // Genera cronograma de cuotas
    const installmentsToInsert = buildInstallments(
      created.id,
      created.disbursed_date,
      frecuencia,
      created.installments,
      installment_amount,
    )
    const { error: insError } = await supabase.from('loan_installments').insert(installmentsToInsert)
    if (insError) throw insError

    return created
  },

  /** Actualiza el estado de un préstamo. */
  async updateStatus(id: string, status: LoanStatus): Promise<void> {
    const { error } = await supabase.from('contractor_loans').update({ status }).eq('id', id)
    if (error) throw error
  },

  /** Edita los campos del préstamo. Si cambian cuotas, frecuencia o monto, regenera
   *  SOLO las cuotas pendientes (las ya pagadas se preservan). */
  async update(
    id: string,
    updates: {
      principal?: number
      interest_rate?: number
      installments?: number
      frecuencia?: LoanFrecuencia
      disbursement_account_id?: string | null
      notes?: string | null
    },
  ): Promise<ContractorLoan> {
    // Recuperar el estado actual del préstamo
    const { data: current, error: fetchErr } = await supabase.from('contractor_loans').select('*').eq('id', id).single()
    if (fetchErr) throw fetchErr
    const currentLoan = current as ContractorLoan

    const newPrincipal = updates.principal ?? currentLoan.principal
    const newRate = updates.interest_rate ?? currentLoan.interest_rate
    const newInstallments = updates.installments ?? currentLoan.installments
    const newFrecuencia: LoanFrecuencia = updates.frecuencia ?? currentLoan.frecuencia
    const newInstallmentAmount = calcInstallmentAmount(newPrincipal, newRate, newInstallments)

    const { data, error } = await supabase
      .from('contractor_loans')
      .update({
        ...updates,
        frecuencia: newFrecuencia,
        installment_amount: newInstallmentAmount,
      })
      .eq('id', id)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    const updated = data as ContractorLoan

    // Determinar si hay que regenerar cuotas
    const scheduleChanged =
      updates.installments !== undefined ||
      updates.frecuencia !== undefined ||
      updates.principal !== undefined ||
      updates.interest_rate !== undefined

    if (scheduleChanged) {
      // Encontrar cuotas ya pagadas para preservarlas
      const { data: existingRaw, error: fetchInstErr } = await supabase
        .from('loan_installments')
        .select('numero_cuota, estado')
        .eq('loan_id', id)
      if (fetchInstErr) throw fetchInstErr
      const existing = (existingRaw ?? []) as Array<{ numero_cuota: number; estado: string }>
      const paidNumbers = new Set(existing.filter((i) => i.estado === 'pagada').map((i) => i.numero_cuota))

      // Borrar solo las cuotas pendientes
      const { error: delErr } = await supabase
        .from('loan_installments')
        .delete()
        .eq('loan_id', id)
        .eq('estado', 'pendiente')
      if (delErr) throw delErr

      // Insertar las nuevas cuotas para los números no pagados
      const newInstallmentsToInsert = buildInstallments(
        id,
        updated.disbursed_date,
        newFrecuencia,
        newInstallments,
        newInstallmentAmount,
      ).filter((inst) => !paidNumbers.has(inst.numero_cuota))

      if (newInstallmentsToInsert.length > 0) {
        const { error: insErr } = await supabase.from('loan_installments').insert(newInstallmentsToInsert)
        if (insErr) throw insErr
      }
    }

    return updated
  },

  /** Elimina un préstamo por id. */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contractor_loans').delete().eq('id', id)
    if (error) throw error
  },

  // === CRONOGRAMA DE CUOTAS ===

  /** Lista las cuotas de un préstamo ordenadas por número de cuota. */
  async getInstallments(loanId: string): Promise<LoanInstallment[]> {
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*, cuenta_cobro:bank_accounts(*)')
      .eq('loan_id', loanId)
      .order('numero_cuota', { ascending: true })
    if (error) throw error
    return data as LoanInstallment[]
  },

  /** Lista las cuotas de múltiples préstamos en una sola query.
   *  Devuelve `{ [loanId]: LoanInstallment[] }`. */
  async getInstallmentsByLoans(loanIds: string[]): Promise<Record<string, LoanInstallment[]>> {
    if (loanIds.length === 0) return {}
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*')
      .in('loan_id', loanIds)
      .order('numero_cuota', { ascending: true })
    if (error) throw error
    const map: Record<string, LoanInstallment[]> = {}
    for (const row of (data ?? []) as LoanInstallment[]) {
      if (!map[row.loan_id]) map[row.loan_id] = []
      map[row.loan_id].push(row)
    }
    return map
  },

  /** Marca una cuota como pagada y registra la cuenta de cobro y la fecha real. */
  async markInstallmentPaid(installmentId: string, fechaPagoReal?: string, cuentaCobroId?: string): Promise<void> {
    const { error } = await supabase
      .from('loan_installments')
      .update({
        estado: 'pagada',
        fecha_pago_real: fechaPagoReal ?? new Date().toISOString().slice(0, 10),
        cuenta_cobro_id: cuentaCobroId ?? null,
      })
      .eq('id', installmentId)
    if (error) throw error
  },

  // === DEDUCCIONES ===

  /** Lista las deducciones de préstamo aplicadas en un período de nómina. */
  async getDeductionsByPeriod(periodId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .select('*, loan:contractor_loans(*, contractor:contractors(*))')
      .eq('payroll_period_id', periodId)
    if (error) throw error
    return data as LoanDeduction[]
  },

  /** Lista las deducciones asociadas a un préstamo. */
  async getDeductionsByLoan(loanId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase.from('loan_deductions').select('*').eq('loan_id', loanId)
    if (error) throw error
    return data as LoanDeduction[]
  },

  /** Crea una deducción de préstamo en un período de nómina. */
  async addDeduction(deduction: {
    loan_id: string
    payroll_period_id: string
    contractor_id: string
    amount: number
  }): Promise<LoanDeduction> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .insert(deduction)
      .select('*, loan:contractor_loans(*, contractor:contractors(*))')
      .single()
    if (error) throw error
    return data as LoanDeduction
  },

  /** Elimina una deducción de préstamo por id. */
  async deleteDeduction(id: string): Promise<void> {
    const { error } = await supabase.from('loan_deductions').delete().eq('id', id)
    if (error) throw error
  },

  /** Total pagado de un préstamo a partir de sus deducciones */
  async getTotalPaid(loanId: string): Promise<number> {
    const deductions = await this.getDeductionsByLoan(loanId)
    return deductions.reduce((sum, d) => sum + d.amount, 0)
  },

  /** Total pagado para múltiples préstamos en UNA sola query.
   *  Devuelve `{ [loanId]: totalPaid }`. IDs sin deducciones no aparecen en el map. */
  async getTotalPaidByLoans(loanIds: string[]): Promise<Record<string, number>> {
    if (loanIds.length === 0) return {}
    const { data, error } = await supabase.from('loan_deductions').select('loan_id, amount').in('loan_id', loanIds)
    if (error) throw error
    const totals: Record<string, number> = {}
    for (const row of (data ?? []) as Array<{ loan_id: string; amount: number }>) {
      totals[row.loan_id] = (totals[row.loan_id] ?? 0) + row.amount
    }
    return totals
  },
}
