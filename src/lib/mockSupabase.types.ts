export type MockRow = Record<string, unknown> & { id?: unknown; created_at?: unknown }
export type MockTable = MockRow[]
export type MockDb = Record<string, MockTable>

export interface MockFilter {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'like' | 'in' | 'is'
  value: unknown
}

export interface MockOrder {
  field: string
  ascending: boolean
}

export interface MockResult<T = unknown> {
  data: T
  error: unknown
}

export type MockOperation = 'select' | 'insert' | 'update' | 'delete'
