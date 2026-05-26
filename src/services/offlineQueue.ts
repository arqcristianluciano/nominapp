// Offline action queue backed by IndexedDB.
// Field workers can record attendance/bitacora entries with no network and
// have them processed once connectivity is restored. The queue is intentionally
// generic: callers register handlers keyed by `type` and the processor will
// dispatch each pending action to the matching handler.
//
// No external dependencies: a small ~30 line wrapper around the raw IndexedDB
// API is used. If/when `idb-keyval` is added to the project this module can be
// swapped for it transparently.

export interface QueuedAction {
  id: string
  type: string
  payload: unknown
  createdAt: number
  retries: number
}

const DB_NAME = 'nominapp-offline-queue'
const DB_VERSION = 1
const STORE = 'actions'
const MAX_RETRIES = 5

// --- Minimal IndexedDB wrapper ---------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb()
  try {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const result = await Promise.resolve(fn(store))
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'))
    })
    return result
  } finally {
    db.close()
  }
}

// --- Public API ------------------------------------------------------------

function generateId(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `act_${Date.now()}_${rand}`
}

export async function enqueue(type: string, payload: unknown): Promise<string> {
  const action: QueuedAction = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  }
  await withStore('readwrite', (store) => request(store.put(action)))
  return action.id
}

export async function dequeue(id: string): Promise<void> {
  await withStore('readwrite', (store) => request(store.delete(id)))
}

export async function peekAll(): Promise<QueuedAction[]> {
  return withStore('readonly', async (store) => {
    const items = await request(store.getAll() as IDBRequest<QueuedAction[]>)
    return (items ?? []).slice().sort((a, b) => a.createdAt - b.createdAt)
  })
}

async function bumpRetries(action: QueuedAction): Promise<void> {
  const updated: QueuedAction = { ...action, retries: action.retries + 1 }
  await withStore('readwrite', (store) => request(store.put(updated)))
}

export async function processQueue(
  handlers: Record<string, (payload: unknown) => Promise<void>>,
): Promise<{ processed: number; failed: number }> {
  const actions = await peekAll()
  let processed = 0
  let failed = 0

  for (const action of actions) {
    // Drop actions that have exhausted their retry budget so we don't loop
    // forever on a permanently broken payload.
    if (action.retries >= MAX_RETRIES) {
      await dequeue(action.id)
      failed += 1
      continue
    }

    const handler = handlers[action.type]
    if (!handler) {
      // Unknown type: leave it queued for a future handler registration.
      continue
    }

    try {
      await handler(action.payload)
      await dequeue(action.id)
      processed += 1
    } catch {
      await bumpRetries(action)
      failed += 1
    }
  }

  return { processed, failed }
}
