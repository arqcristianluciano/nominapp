import { SEED_DATA } from './mockData'
import type {
  MockDb, MockFilter, MockOrder, MockResult, MockRow, MockTable, MockOperation,
} from './mockSupabase.types'

const db: MockDb = {}

for (const [table, rows] of Object.entries(SEED_DATA)) {
  db[table] = JSON.parse(JSON.stringify(rows)) as MockRow[]
}

function generateId(): string {
  return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function resolveRelations(_table: string, row: MockRow, selectStr: string): MockRow {
  const relationRegex = /(\w+):(\w+)\(([^)]*)\)/g
  let match: RegExpExecArray | null
  const result: MockRow = { ...row }

  while ((match = relationRegex.exec(selectStr)) !== null) {
    const [, alias, foreignTable] = match
    const fkField = `${alias}_id`

    if (row[fkField] && db[foreignTable]) {
      const related = db[foreignTable].find((r) => r.id === row[fkField])
      result[alias] = related ? { ...related } : null
    } else if (!row[fkField]) {
      if (db[foreignTable]) {
        const hasManyRows = db[foreignTable].filter((fr) =>
          Object.keys(fr).some((k) => k.endsWith('_id') && fr[k] === row.id)
        )
        result[alias] = hasManyRows.length > 0 ? hasManyRows : (row[alias] ?? null)
      } else {
        result[alias] = row[alias] ?? null
      }
    }
  }

  return result
}

function matchPattern(value: unknown, pattern: string, caseInsensitive: boolean): boolean {
  if (value == null) return false
  const str = String(value)
  const target = caseInsensitive ? str.toLowerCase() : str
  const pat = caseInsensitive ? pattern.toLowerCase() : pattern
  const regex = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$')
  return regex.test(target)
}

function applyFilters(rows: MockRow[], filters: MockFilter[]): MockRow[] {
  return rows.filter((r) => filters.every((f) => {
    const v = r[f.field]
    if (f.op === 'eq') return v === f.value
    if (f.op === 'neq') return v !== f.value
    if (f.op === 'gt') return (v as number) > (f.value as number)
    if (f.op === 'gte') return (v as number) >= (f.value as number)
    if (f.op === 'lt') return (v as number) < (f.value as number)
    if (f.op === 'lte') return (v as number) <= (f.value as number)
    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(v)
    if (f.op === 'ilike') return matchPattern(v, String(f.value), true)
    if (f.op === 'like') return matchPattern(v, String(f.value), false)
    return true
  }))
}

function applyOrFilter(rows: MockRow[], orFilter: string): MockRow[] {
  const parts = orFilter.split(',')
  return rows.filter((r) =>
    parts.some((part) => {
      const m = part.trim().match(/(\w+)\.(eq|is)\.(true|false|.+)/)
      if (!m) return true
      const [, field, op, val] = m
      if (op === 'eq') return String(r[field]) === val
      if (op === 'is' && val === 'true') return r[field] === true
      return false
    })
  )
}

function applyOrder(rows: MockRow[], orders: MockOrder[]): MockRow[] {
  for (const o of orders) {
    rows.sort((a, b) => {
      const av = (a[o.field] ?? '') as string | number
      const bv = (b[o.field] ?? '') as string | number
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return o.ascending ? cmp : -cmp
    })
  }
  return rows
}

class MockQueryBuilder {
  private _table: string
  private _select = '*'
  private _filters: MockFilter[] = []
  private _order: MockOrder[] = []
  private _limit: number | null = null
  private _single = false
  private _operation: MockOperation = 'select'
  private _data: MockRow | MockRow[] | null = null
  private _orFilter: string | null = null

  constructor(table: string) { this._table = table }

  select(fields = '*'): this {
    this._select = fields
    if (this._operation === 'select') this._operation = 'select'
    return this
  }

  insert(data: MockRow | MockRow[]): this {
    this._operation = 'insert'
    this._data = Array.isArray(data) ? data : [data]
    return this
  }

  update(data: MockRow): this {
    this._operation = 'update'
    this._data = data
    return this
  }

  delete(): this { this._operation = 'delete'; return this }
  eq(field: string, value: unknown): this { this._filters.push({ field, op: 'eq', value }); return this }
  neq(field: string, value: unknown): this { this._filters.push({ field, op: 'neq', value }); return this }
  gt(field: string, value: unknown): this { this._filters.push({ field, op: 'gt', value }); return this }
  gte(field: string, value: unknown): this { this._filters.push({ field, op: 'gte', value }); return this }
  lt(field: string, value: unknown): this { this._filters.push({ field, op: 'lt', value }); return this }
  lte(field: string, value: unknown): this { this._filters.push({ field, op: 'lte', value }); return this }
  ilike(field: string, pattern: string): this { this._filters.push({ field, op: 'ilike', value: pattern }); return this }
  like(field: string, pattern: string): this { this._filters.push({ field, op: 'like', value: pattern }); return this }
  is(field: string, value: unknown): this { this._filters.push({ field, op: 'eq', value }); return this }
  in(field: string, values: unknown[]): this { this._filters.push({ field, op: 'in', value: values }); return this }
  or(filterStr: string): this { this._orFilter = filterStr; return this }
  order(field: string, options?: { ascending?: boolean }): this {
    this._order.push({ field, ascending: options?.ascending ?? true })
    return this
  }
  limit(n: number): this { this._limit = n; return this }
  single(): this { this._single = true; return this }
  maybeSingle(): this { this._single = true; return this }

  async then(
    resolve: (result: MockResult) => void,
    reject?: (err: unknown) => void
  ): Promise<void> {
    try { resolve(this.execute()) } catch (e) { if (reject) reject(e) }
  }

  execute(): MockResult {
    if (!db[this._table]) db[this._table] = []
    const table = db[this._table]

    if (this._operation === 'select') return this.executeSelect(table)
    if (this._operation === 'insert') return this.executeInsert(table)
    if (this._operation === 'update') return this.executeUpdate(table)
    if (this._operation === 'delete') return this.executeDelete(table)
    return { data: null, error: null }
  }

  private executeSelect(table: MockTable): MockResult {
    let rows = applyFilters([...table], this._filters)
    if (this._orFilter) rows = applyOrFilter(rows, this._orFilter)
    rows = applyOrder(rows, this._order)
    if (this._limit) rows = rows.slice(0, this._limit)
    rows = rows.map((r) => resolveRelations(this._table, r, this._select))
    return this._single
      ? { data: rows[0] || null, error: null }
      : { data: rows, error: null }
  }

  private executeInsert(table: MockTable): MockResult {
    const inserted: MockRow[] = []
    const items = Array.isArray(this._data) ? this._data : []
    for (const item of items) {
      const newRow: MockRow = {
        ...item,
        id: item.id || generateId(),
        created_at: item.created_at || new Date().toISOString(),
      }
      table.push(newRow)
      inserted.push(newRow)
    }
    if (this._single || inserted.length === 1) {
      const last = inserted[inserted.length - 1]
      return {
        data: this._single
          ? resolveRelations(this._table, last, this._select)
          : inserted.map((r) => resolveRelations(this._table, r, this._select)),
        error: null,
      }
    }
    return {
      data: inserted.map((r) => resolveRelations(this._table, r, this._select)),
      error: null,
    }
  }

  private executeUpdate(table: MockTable): MockResult {
    const matched = applyFilters([...table], this._filters)
    for (const row of matched) {
      const idx = table.indexOf(row)
      if (idx >= 0 && this._data && !Array.isArray(this._data)) {
        Object.assign(table[idx], this._data)
      }
    }
    if (this._single && matched.length > 0) {
      const updated = table.find((r) => r.id === matched[0].id)
      return { data: updated ? resolveRelations(this._table, updated, this._select) : null, error: null }
    }
    return {
      data: matched.map((r) => resolveRelations(this._table, r, this._select)),
      error: null,
    }
  }

  private executeDelete(table: MockTable): MockResult {
    const toDelete = applyFilters([...table], this._filters)
    const deleteIds = new Set(toDelete.map((r) => r.id))
    db[this._table] = table.filter((r) => !deleteIds.has(r.id))
    return { data: null, error: null }
  }
}

export const mockSupabase = {
  from(table: string) { return new MockQueryBuilder(table) },
}
