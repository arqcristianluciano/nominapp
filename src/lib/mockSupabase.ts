import { SEED_DATA } from './mockData'

// In-memory database
const db: Record<string, any[]> = {}

// Deep clone seed data into db
for (const [table, rows] of Object.entries(SEED_DATA)) {
  db[table] = JSON.parse(JSON.stringify(rows))
}

function generateId() {
  return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function resolveRelations(table: string, row: any, selectStr: string) {
  const relationRegex = /(\w+):(\w+)\(([^)]*)\)/g
  let match
  const result = { ...row }

  while ((match = relationRegex.exec(selectStr)) !== null) {
    const [, alias, foreignTable, _fields] = match
    const fkField = `${alias}_id`

    if (row[fkField] && db[foreignTable]) {
      // belongs-to: FK en esta tabla → objeto único
      const related = db[foreignTable].find((r: any) => r.id === row[fkField])
      result[alias] = related ? { ...related } : null
    } else if (!row[fkField]) {
      if (db[foreignTable]) {
        // has-many: busca en foreignTable filas donde algún campo _id apunta a row.id
        const hasManyRows = (db[foreignTable] as any[]).filter((fr) =>
          Object.keys(fr).some((k) => k.endsWith('_id') && fr[k] === row.id)
        )
        if (hasManyRows.length > 0) {
          // Relación has-many → array
          result[alias] = hasManyRows
        } else {
          result[alias] = row[alias] ?? null
        }
      } else {
        result[alias] = row[alias] ?? null
      }
    }
  }

  return result
}

class MockQueryBuilder {
  private _table: string
  private _select: string = '*'
  private _filters: { field: string; op: string; value: any }[] = []
  private _order: { field: string; ascending: boolean }[] = []
  private _limit: number | null = null
  private _single = false
  private _operation: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private _data: any = null
  private _orFilter: string | null = null

  constructor(table: string) {
    this._table = table
  }

  select(fields: string = '*') {
    this._select = fields
    if (this._operation !== 'insert' && this._operation !== 'update' && this._operation !== 'delete') {
      this._operation = 'select'
    }
    return this
  }

  insert(data: any) {
    this._operation = 'insert'
    this._data = Array.isArray(data) ? data : [data]
    return this
  }

  update(data: any) {
    this._operation = 'update'
    this._data = data
    return this
  }

  delete() {
    this._operation = 'delete'
    return this
  }

  eq(field: string, value: any) {
    this._filters.push({ field, op: 'eq', value })
    return this
  }

  gte(field: string, value: any) {
    this._filters.push({ field, op: 'gte', value })
    return this
  }

  lte(field: string, value: any) {
    this._filters.push({ field, op: 'lte', value })
    return this
  }

  or(filterStr: string) {
    this._orFilter = filterStr
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this._order.push({ field, ascending: options?.ascending ?? true })
    return this
  }

  limit(n: number) {
    this._limit = n
    return this
  }

  single() {
    this._single = true
    return this
  }

  async then(resolve: (result: any) => void, reject?: (err: any) => void) {
    try {
      const result = this.execute()
      resolve(result)
    } catch (e) {
      if (reject) reject(e)
    }
  }

  execute(): { data: any; error: any } {
    if (!db[this._table]) db[this._table] = []
    const table = db[this._table]

    switch (this._operation) {
      case 'select': {
        let rows = [...table]

        // Apply filters
        for (const f of this._filters) {
          rows = rows.filter((r) => {
            if (f.op === 'eq') return r[f.field] === f.value
            if (f.op === 'gte') return r[f.field] >= f.value
            if (f.op === 'lte') return r[f.field] <= f.value
            return true
          })
        }

        // Apply OR filter
        if (this._orFilter) {
          const parts = this._orFilter.split(',')
          rows = rows.filter((r) =>
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

        // Apply order
        for (const o of this._order) {
          rows.sort((a, b) => {
            const av = a[o.field] ?? ''
            const bv = b[o.field] ?? ''
            const cmp = av < bv ? -1 : av > bv ? 1 : 0
            return o.ascending ? cmp : -cmp
          })
        }

        if (this._limit) rows = rows.slice(0, this._limit)

        // Resolve relations
        rows = rows.map((r) => resolveRelations(this._table, r, this._select))

        if (this._single) {
          return { data: rows[0] || null, error: rows.length === 0 ? null : null }
        }
        return { data: rows, error: null }
      }

      case 'insert': {
        const inserted: any[] = []
        for (const item of this._data) {
          const newRow = { ...item, id: item.id || generateId(), created_at: item.created_at || new Date().toISOString() }
          table.push(newRow)
          inserted.push(newRow)
        }
        // Chain select
        this._operation = 'select'
        if (this._single || inserted.length === 1) {
          const resolved = resolveRelations(this._table, inserted[inserted.length - 1], this._select)
          return { data: this._single ? resolved : inserted.map((r) => resolveRelations(this._table, r, this._select)), error: null }
        }
        return { data: inserted.map((r) => resolveRelations(this._table, r, this._select)), error: null }
      }

      case 'update': {
        let rows = [...table]
        for (const f of this._filters) {
          rows = rows.filter((r) => r[f.field] === f.value)
        }
        for (const row of rows) {
          const idx = table.indexOf(row)
          if (idx >= 0) {
            Object.assign(table[idx], this._data)
          }
        }
        if (this._single && rows.length > 0) {
          const updated = table.find((r) => r.id === rows[0].id)
          return { data: resolveRelations(this._table, updated, this._select), error: null }
        }
        return { data: rows.map((r) => resolveRelations(this._table, r, this._select)), error: null }
      }

      case 'delete': {
        for (const f of this._filters) {
          const idx = table.findIndex((r) => r[f.field] === f.value)
          if (idx >= 0) table.splice(idx, 1)
        }
        return { data: null, error: null }
      }

      default:
        return { data: null, error: null }
    }
  }
}

export const mockSupabase = {
  from(table: string) {
    return new MockQueryBuilder(table)
  },
}
