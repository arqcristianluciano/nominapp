import * as Sentry from '@sentry/react'
import { supabase } from '@/lib/supabase'
import type { ContractorLoan, LoanDeduction, LoanFrecuencia, LoanInstallment, LoanStatus } from '@/types/database'
import { accountMovementService } from '@/services/accountMovementService'
import { add, div, money, mul, pct, round2 } from '@/utils/money'

/** Cuota fija: capital + interés simple distribuido en N cuotas */
export function calcInstallmentAmount(principal: number, interestRate: number, installments: number): number {
  if (installments <= 0) return 0
  const base = money(principal)
  const totalInterest = pct(base, interestRate)
  return round2(div(add(base, totalInterest), installments))
}

/** Calcula la fecha de una cuota a partir de la fecha de desembolso, frecuencia y número de cuota.
 *  Si se indica `firstInstallmentDate`, la cuota 1 cae exactamente en esa fecha
 *  y las siguientes se calculan desde ahí según la frecuencia. */
export function calcInstallmentDate(
  disbursedDate: string,
  frecuencia: LoanFrecuencia,
  numeroCuota: number,
  firstInstallmentDate?: string | null,
): string {
  const baseDate = firstInstallmentDate || disbursedDate
  // Con fecha de primera cuota, la cuota 1 no se desplaza (offset 0).
  const steps = firstInstallmentDate ? numeroCuota - 1 : numeroCuota
  const base = new Date(baseDate + 'T00:00:00')
  if (frecuencia === 'semanal') {
    base.setDate(base.getDate() + steps * 7)
  } else if (frecuencia === 'quincenal') {
    base.setDate(base.getDate() + steps * 15)
  } else {
    // mensual: suma meses exactos
    base.setMonth(base.getMonth() + steps)
  }
  return base.toISOString().slice(0, 10)
}

/** Totales de avance de un préstamo, con el mismo criterio que la tabla:
 *  - Un préstamo 'paid' se considera saldado (pagado = total, saldo = 0).
 *  - El pago llega por dos vías (deducción de nómina o cuota cobrada);
 *    se toma el mayor para no sumar dos veces lo mismo. */
export function calcLoanProgress(
  loan: Pick<ContractorLoan, 'status' | 'installment_amount' | 'installments'>,
  paidFromDeductions: number,
  installments: Array<Pick<LoanInstallment, 'estado' | 'monto'>>,
): { totalOwed: number; effectivePaid: number; balance: number } {
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  const paidInstallments = round2(installments.reduce((sum, i) => (i.estado === 'pagada' ? sum + i.monto : sum), 0))
  const paidRecorded = Math.max(paidFromDeductions, paidInstallments)
  const isSettled = loan.status === 'paid'
  return {
    totalOwed,
    effectivePaid: isSettled ? totalOwed : paidRecorded,
    balance: isSettled ? 0 : Math.max(0, round2(totalOwed - paidRecorded)),
  }
}

/** Intereses ganados de un préstamo según lo cobrado hasta ahora.
 *  Cada cuota incluye capital e interés en la misma proporción, así que el
 *  interés ganado es proporcional a lo cobrado: si se cobró la mitad del
 *  total, se ganó la mitad del interés. */
export function calcInterestEarned(
  loan: Pick<ContractorLoan, 'principal' | 'installment_amount' | 'installments'>,
  effectivePaid: number,
): number {
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  if (totalOwed <= 0 || effectivePaid <= 0) return 0
  const totalInterest = Math.max(0, round2(totalOwed - loan.principal))
  return round2(totalInterest * Math.min(1, effectivePaid / totalOwed))
}

/** Una cuota está vencida si sigue pendiente y su fecha programada ya pasó.
 *  `todayStr` (AAAA-MM-DD) se puede inyectar en tests; por defecto es hoy. */
export function isInstallmentOverdue(
  installment: Pick<LoanInstallment, 'estado' | 'fecha_pago_programada'>,
  todayStr: string = new Date().toISOString().slice(0, 10),
): boolean {
  return installment.estado !== 'pagada' && installment.fecha_pago_programada < todayStr
}

/** Cantidad de cuotas vencidas en un cronograma. */
export function countOverdueInstallments(
  installments: Array<Pick<LoanInstallment, 'estado' | 'fecha_pago_programada'>>,
  todayStr?: string,
): number {
  return installments.filter((i) => isInstallmentOverdue(i, todayStr)).length
}

/** Genera el array de cuotas a insertar para un préstamo recién creado. */
function buildInstallments(
  loanId: string,
  disbursedDate: string,
  frecuencia: LoanFrecuencia,
  installments: number,
  installmentAmount: number,
  firstInstallmentDate?: string | null,
): Array<{
  loan_id: string
  numero_cuota: number
  fecha_pago_programada: string
  monto: number
}> {
  return Array.from({ length: installments }, (_, idx) => ({
    loan_id: loanId,
    numero_cuota: idx + 1,
    fecha_pago_programada: calcInstallmentDate(disbursedDate, frecuencia, idx + 1, firstInstallmentDate),
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
   *  generando el cronograma de cuotas según la frecuencia indicada.
   *  Si hay cuenta de desembolso, registra la salida de dinero en esa cuenta. */
  async create(loan: {
    contractor_id: string
    principal: number
    interest_rate: number
    installments: number
    disbursed_date: string
    first_installment_date?: string | null
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
      created.first_installment_date,
    )
    const { error: insError } = await supabase.from('loan_installments').insert(installmentsToInsert)
    if (insError) throw insError

    // Registra la salida de dinero en la cuenta de desembolso (si se indicó)
    if (loan.disbursement_account_id) {
      try {
        await accountMovementService.create({
          account_id: loan.disbursement_account_id,
          fecha: loan.disbursed_date,
          tipo: 'debito',
          monto: loan.principal,
          concepto: `Desembolso de préstamo — ${created.contractor?.name ?? 'contratista'}`,
          origen: 'loan_disbursement',
          referencia_id: created.id,
        })
      } catch (movErr) {
        // El préstamo y las cuotas ya se crearon. El movimiento falló de forma aislada;
        // no se revierte la operación principal para no bloquear al usuario.
        // Se captura en Sentry para revisión posterior.
        console.error('[loanService.create] No se pudo registrar movimiento de desembolso:', movErr)
        Sentry.captureException(movErr, { tags: { area: 'loanService', op: 'create_movement' } })
      }
    }

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
      disbursed_date?: string
      first_installment_date?: string | null
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

    // Lista blanca de campos editables: el formulario envía el objeto completo
    // y campos como contractor_id no deben llegar al UPDATE (JSON.stringify
    // descarta los undefined al serializar la petición).
    const { data, error } = await supabase
      .from('contractor_loans')
      .update({
        principal: updates.principal,
        interest_rate: updates.interest_rate,
        installments: updates.installments,
        disbursed_date: updates.disbursed_date,
        first_installment_date: updates.first_installment_date,
        disbursement_account_id: updates.disbursement_account_id,
        notes: updates.notes,
        frecuencia: newFrecuencia,
        installment_amount: newInstallmentAmount,
      })
      .eq('id', id)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    const updated = data as ContractorLoan

    // Regenerar cuotas solo si cambió algo que afecte el cronograma; así una
    // edición de notas o cuenta no pisa fechas de cuotas ajustadas a mano.
    const scheduleChanged =
      (updates.installments !== undefined && updates.installments !== currentLoan.installments) ||
      (updates.frecuencia !== undefined && updates.frecuencia !== currentLoan.frecuencia) ||
      (updates.principal !== undefined && updates.principal !== currentLoan.principal) ||
      (updates.interest_rate !== undefined && updates.interest_rate !== currentLoan.interest_rate) ||
      (updates.disbursed_date !== undefined && updates.disbursed_date !== currentLoan.disbursed_date) ||
      (updates.first_installment_date !== undefined &&
        (updates.first_installment_date ?? null) !== (currentLoan.first_installment_date ?? null))

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
        updated.first_installment_date,
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

  /** Cambia la fecha programada de una cuota. Solo se permite en cuotas
   *  pendientes: la fecha de una cuota ya pagada es un hecho histórico. */
  async updateInstallmentDate(installmentId: string, fechaProgramada: string): Promise<void> {
    const { data, error } = await supabase
      .from('loan_installments')
      .update({ fecha_pago_programada: fechaProgramada })
      .eq('id', installmentId)
      .eq('estado', 'pendiente')
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('La cuota ya está pagada; su fecha programada no se puede cambiar.')
    }
  },

  /** Marca una cuota como pagada, registra la cuenta de cobro y la fecha real.
   *  Si hay cuenta de cobro, genera un movimiento de entrada en esa cuenta. */
  async markInstallmentPaid(installmentId: string, fechaPagoReal?: string, cuentaCobroId?: string): Promise<void> {
    const fechaPago = fechaPagoReal ?? new Date().toISOString().slice(0, 10)

    // Obtener datos de la cuota antes de actualizarla (para el concepto del movimiento)
    const { data: instData, error: fetchErr } = await supabase
      .from('loan_installments')
      .select('*, loan:contractor_loans(principal, contractor:contractors(name))')
      .eq('id', installmentId)
      .single()
    if (fetchErr) throw fetchErr
    const inst = instData as LoanInstallment & {
      loan?: { principal: number; contractor?: { name: string } }
    }

    // Actualizar la cuota como pagada SOLO si aun no estaba pagada. Asi un doble
    // clic (o dos personas a la vez) no registra el cobro dos veces: el segundo
    // intento no actualiza ninguna fila y salimos sin duplicar el movimiento.
    const { data: updatedRows, error } = await supabase
      .from('loan_installments')
      .update({
        estado: 'pagada',
        fecha_pago_real: fechaPago,
        cuenta_cobro_id: cuentaCobroId ?? null,
      })
      .eq('id', installmentId)
      .neq('estado', 'pagada')
      .select('id')
    if (error) throw error
    if (!updatedRows || updatedRows.length === 0) {
      // La cuota ya estaba pagada: no se duplica el movimiento de cobro.
      return
    }

    // Registrar la entrada de dinero en la cuenta de cobro (si se indicó)
    if (cuentaCobroId) {
      const contratistaNombre = inst.loan?.contractor?.name ?? 'contratista'
      try {
        await accountMovementService.create({
          account_id: cuentaCobroId,
          fecha: fechaPago,
          tipo: 'credito',
          monto: inst.monto,
          concepto: `Cobro cuota #${inst.numero_cuota} — ${contratistaNombre}`,
          origen: 'loan_repayment',
          referencia_id: installmentId,
        })
      } catch (movErr) {
        // La cuota ya fue marcada como pagada. El movimiento falló de forma aislada;
        // no se revierte el pago para no bloquear al usuario.
        console.error('[loanService.markInstallmentPaid] No se pudo registrar movimiento de cobro:', movErr)
        Sentry.captureException(movErr, { tags: { area: 'loanService', op: 'repayment_movement' } })
      }
    }
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
