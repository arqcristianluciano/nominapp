import { supabase } from '@/lib/supabase'
import type { AccountMovement, AccountMovementOrigen, AccountMovementTipo, BankAccount } from '@/types/database'

/** Saldo calculado de una cuenta bancaria a partir de sus movimientos. */
export interface AccountBalance {
  account: BankAccount
  totalCreditos: number
  totalDebitos: number
  saldo: number
}

export const accountMovementService = {
  /** Lista todos los movimientos de una cuenta, ordenados del más reciente al más antiguo. */
  async getByAccount(accountId: string): Promise<AccountMovement[]> {
    const { data, error } = await supabase
      .from('account_movements')
      .select('*')
      .eq('account_id', accountId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as AccountMovement[]
  },

  /** Lista los movimientos de múltiples cuentas en una sola query.
   *  Devuelve `{ [accountId]: AccountMovement[] }`. */
  async getByAccounts(accountIds: string[]): Promise<Record<string, AccountMovement[]>> {
    if (accountIds.length === 0) return {}
    const { data, error } = await supabase
      .from('account_movements')
      .select('*')
      .in('account_id', accountIds)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    const map: Record<string, AccountMovement[]> = {}
    for (const row of (data ?? []) as AccountMovement[]) {
      if (!map[row.account_id]) map[row.account_id] = []
      map[row.account_id].push(row)
    }
    return map
  },

  /** Calcula el saldo de una cuenta: suma de créditos − suma de débitos. */
  calcSaldo(movements: AccountMovement[]): { totalCreditos: number; totalDebitos: number; saldo: number } {
    let totalCreditos = 0
    let totalDebitos = 0
    for (const m of movements) {
      if (m.tipo === 'credito') totalCreditos += m.monto
      else totalDebitos += m.monto
    }
    return { totalCreditos, totalDebitos, saldo: totalCreditos - totalDebitos }
  },

  /** Registra un movimiento de cuenta.
   *  Uso interno: llamar desde loanService para que sea parte de la misma operación. */
  async create(movement: {
    account_id: string
    fecha: string
    tipo: AccountMovementTipo
    monto: number
    concepto: string
    origen: AccountMovementOrigen | string
    referencia_id?: string | null
  }): Promise<AccountMovement> {
    const { data, error } = await supabase.from('account_movements').insert(movement).select('*').single()
    if (error) throw error
    return data as AccountMovement
  },

  /** Elimina los movimientos asociados a una referencia (para rollback manual si es necesario). */
  async deleteByReferencia(referenciaId: string): Promise<void> {
    const { error } = await supabase.from('account_movements').delete().eq('referencia_id', referenciaId)
    if (error) throw error
  },
}
