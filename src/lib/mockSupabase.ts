import { SEED_DATA } from './mockData'
import type { MockDb, MockFilter, MockOrder, MockResult, MockRow, MockTable, MockOperation } from './mockSupabase.types'

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
          Object.keys(fr).some((k) => k.endsWith('_id') && fr[k] === row.id),
        )
        result[alias] = hasManyRows.length > 0 ? hasManyRows : (row[alias] ?? null)
      } else {
        result[alias] = row[alias] ?? null
      }
    }
  }

  return result
}

function unaccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function matchPattern(value: unknown, pattern: string, caseInsensitive: boolean): boolean {
  if (value == null) return false
  const norm = (s: string) => (caseInsensitive ? unaccent(s.toLowerCase()) : s)
  const target = norm(String(value))
  const pat = norm(pattern)
  const regex = new RegExp(
    '^' +
      pat
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.') +
      '$',
  )
  return regex.test(target)
}

function applyFilters(rows: MockRow[], filters: MockFilter[]): MockRow[] {
  return rows.filter((r) =>
    filters.every((f) => {
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
    }),
  )
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
    }),
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

  constructor(table: string) {
    this._table = table
  }

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

  delete(): this {
    this._operation = 'delete'
    return this
  }
  eq(field: string, value: unknown): this {
    this._filters.push({ field, op: 'eq', value })
    return this
  }
  neq(field: string, value: unknown): this {
    this._filters.push({ field, op: 'neq', value })
    return this
  }
  gt(field: string, value: unknown): this {
    this._filters.push({ field, op: 'gt', value })
    return this
  }
  gte(field: string, value: unknown): this {
    this._filters.push({ field, op: 'gte', value })
    return this
  }
  lt(field: string, value: unknown): this {
    this._filters.push({ field, op: 'lt', value })
    return this
  }
  lte(field: string, value: unknown): this {
    this._filters.push({ field, op: 'lte', value })
    return this
  }
  ilike(field: string, pattern: string): this {
    this._filters.push({ field, op: 'ilike', value: pattern })
    return this
  }
  like(field: string, pattern: string): this {
    this._filters.push({ field, op: 'like', value: pattern })
    return this
  }
  is(field: string, value: unknown): this {
    this._filters.push({ field, op: 'eq', value })
    return this
  }
  in(field: string, values: unknown[]): this {
    this._filters.push({ field, op: 'in', value: values })
    return this
  }
  or(filterStr: string): this {
    this._orFilter = filterStr
    return this
  }
  order(field: string, options?: { ascending?: boolean }): this {
    this._order.push({ field, ascending: options?.ascending ?? true })
    return this
  }
  limit(n: number): this {
    this._limit = n
    return this
  }
  single(): this {
    this._single = true
    return this
  }
  maybeSingle(): this {
    this._single = true
    return this
  }

  async then(resolve: (result: MockResult) => void, reject?: (err: unknown) => void): Promise<void> {
    try {
      resolve(this.execute())
    } catch (e) {
      if (reject) reject(e)
    }
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
    return this._single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
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

interface MockChannel {
  on: (event: string, filter: unknown, handler: (...args: unknown[]) => void) => MockChannel
  subscribe: (...args: unknown[]) => MockChannel
  unsubscribe: (...args: unknown[]) => MockChannel
}

function createMockChannel(name: string): MockChannel {
  const channel: MockChannel = {
    name,
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => channel,
  } as MockChannel & { name: string }
  return channel
}

// Stub mínimo de Storage para modo demo. Mantiene los archivos subidos en
// memoria (object URLs) durante la sesión para que adjuntar y "ver" funcionen
// sin un backend real. No persiste entre recargas.
const storageObjects = new Map<string, string>()

function createObjectUrlSafe(blob: Blob): string | null {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(blob)
  }
  return null
}

function mockStorageBucket() {
  return {
    async upload(path: string, file: Blob): Promise<MockResult<{ path: string }>> {
      const url = createObjectUrlSafe(file)
      if (url) storageObjects.set(path, url)
      return { data: { path }, error: null }
    },
    async createSignedUrl(path: string): Promise<MockResult<{ signedUrl: string } | null>> {
      const signedUrl = storageObjects.get(path)
      return { data: signedUrl ? { signedUrl } : null, error: null }
    },
    async remove(paths: string[]): Promise<MockResult<null>> {
      for (const p of paths) {
        const url = storageObjects.get(p)
        if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url)
        }
        storageObjects.delete(p)
      }
      return { data: null, error: null }
    },
  }
}

// ---------------------------------------------------------------------------
// RPC handlers: implementan en JS la lógica de las funciones de Postgres para
// que el modo demo / tests funcionen sin conexión real a la DB.
// ---------------------------------------------------------------------------

type RpcArgs = Record<string, unknown>
type RpcResult = { data: unknown; error: unknown }

function mockRpcInventoryAddMovement(args: RpcArgs): RpcResult {
  const {
    p_item_id,
    p_project_id,
    p_type,
    p_quantity,
    p_date,
    p_notes = null,
    p_supplier_id = null,
    p_budget_item_id = null,
    p_budget_category_id = null,
    p_purchase_order_id = null,
    p_unit_cost = null,
    p_created_by = null,
    p_lot_id = null,
    p_attachment_path = null,
    p_override_motivo = null,
  } = args

  const qty = Number(p_quantity)
  if (!(qty > 0)) {
    return { data: null, error: { message: 'INVALID_QUANTITY: La cantidad del movimiento debe ser mayor que cero.' } }
  }
  if (p_type === 'out' && !p_budget_item_id && !p_budget_category_id) {
    return {
      data: null,
      error: {
        message: 'OUT_REQUIRES_PARTIDA: Toda salida de almacén debe imputarse a una partida del presupuesto.',
      },
    }
  }

  if (!db['inventory_items']) db['inventory_items'] = []
  const itemIdx = db['inventory_items'].findIndex((r) => r.id === p_item_id)
  if (itemIdx < 0) {
    return { data: null, error: { message: 'ITEM_NOT_FOUND: Material no encontrado.' } }
  }

  const item = db['inventory_items'][itemIdx]
  const currentStock = Number(item.current_stock ?? 0)
  const currentCost = Number(item.unit_cost ?? 0)
  const delta = p_type === 'in' ? qty : -qty
  const newStock = currentStock + delta

  if (newStock < 0 && !p_override_motivo) {
    return {
      data: null,
      error: {
        message: `INSUFFICIENT_STOCK: Stock insuficiente: disponible ${currentStock}, solicitado ${qty}.`,
      },
    }
  }

  // Costo del movimiento: las salidas de consumo (sin orden de compra) sin
  // costo explícito se valoran al costo promedio ponderado vigente del
  // material; las reversas de recepción quedan sin costo (espejo de la
  // migración 087).
  const movementCost =
    p_type === 'out' && p_unit_cost == null && !p_purchase_order_id
      ? currentCost > 0
        ? currentCost
        : null
      : p_unit_cost

  // Insertar movimiento
  if (!db['inventory_movements']) db['inventory_movements'] = []
  const movementId = generateId()
  db['inventory_movements'].push({
    id: movementId,
    item_id: p_item_id,
    project_id: p_project_id,
    type: p_type,
    quantity: qty,
    date: p_date,
    notes: p_notes,
    supplier_id: p_supplier_id,
    budget_item_id: p_budget_item_id,
    budget_category_id: p_budget_category_id,
    purchase_order_id: p_purchase_order_id,
    unit_cost: movementCost,
    created_by: p_created_by,
    lot_id: p_lot_id,
    attachment_path: p_attachment_path,
    override_motivo: p_override_motivo,
    created_at: new Date().toISOString(),
  })

  // Recalcular costo promedio ponderado
  let nextCost = currentCost
  if (p_type === 'in' && p_unit_cost != null && Number(p_unit_cost) > 0) {
    const uc = Number(p_unit_cost)
    const totalQty = currentStock + qty
    nextCost = totalQty > 0 ? (currentStock * currentCost + qty * uc) / totalQty : uc
  }

  // Actualizar stock y costo
  db['inventory_items'][itemIdx] = { ...item, current_stock: newStock, unit_cost: nextCost }

  return { data: movementId, error: null }
}

function mockRpcIncrementPaymentAmount(args: RpcArgs): RpcResult {
  const { p_id, p_delta, p_period_cap = null } = args

  const delta = Number(p_delta)
  if (!(delta > 0)) {
    return { data: null, error: { message: 'DELTA_NOT_POSITIVE: El monto a sumar debe ser mayor que cero.' } }
  }

  if (!db['payment_distributions']) db['payment_distributions'] = []
  const idx = db['payment_distributions'].findIndex((r) => r.id === p_id)
  if (idx < 0) {
    return { data: null, error: { message: 'PAYMENT_NOT_FOUND: No se encontró el pago a consolidar.' } }
  }

  const row = db['payment_distributions'][idx]

  if (p_period_cap !== null) {
    const cap = Number(p_period_cap)
    const periodId = row.payroll_period_id
    const otherSum = db['payment_distributions']
      .filter((r) => r.payroll_period_id === periodId && r.status !== 'cancelled' && r.id !== p_id)
      .reduce((s, r) => s + Number(r.amount), 0)
    if (otherSum + Number(row.amount) + delta > cap + 0.0001) {
      return {
        data: null,
        error: { message: 'EXCEEDS_PERIOD_CAP: El monto excede el total pendiente por distribuir.' },
      }
    }
  }

  const newAmount = Math.round((Number(row.amount) + delta) * 100) / 100
  db['payment_distributions'][idx] = { ...row, amount: newAmount }
  return { data: { ...db['payment_distributions'][idx] }, error: null }
}

const rpcHandlers: Record<string, (args: RpcArgs) => RpcResult> = {
  rpc_inventory_add_movement: mockRpcInventoryAddMovement,
  rpc_increment_payment_amount: mockRpcIncrementPaymentAmount,
}

export const mockSupabase = {
  from(table: string) {
    return new MockQueryBuilder(table)
  },
  async rpc(name: string, args?: RpcArgs): Promise<RpcResult> {
    const handler = rpcHandlers[name]
    if (!handler) {
      // Stub genérico: devuelve null sin error para RPCs no implementadas.
      return { data: null, error: null }
    }
    return handler(args ?? {})
  },
  channel(name: string): MockChannel {
    return createMockChannel(name)
  },
  // En modo demo no hay realtime, pero los hooks llaman a removeChannel en su
  // cleanup (p. ej. usePendingApprovals/usePendingCortes); devolvemos una
  // promesa resuelta para no romper el desmontaje (incl. el doble efecto de
  // React StrictMode en desarrollo).
  removeChannel(channel?: MockChannel): Promise<'ok'> {
    void channel
    return Promise.resolve('ok')
  },
  removeAllChannels(): Promise<'ok'[]> {
    return Promise.resolve([])
  },
  // El bucket se ignora en demo: todos los archivos viven en el mismo store en memoria.
  storage: {
    from() {
      return mockStorageBucket()
    },
  },
}
