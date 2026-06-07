// Cola offline simple basada en IndexedDB para PWA en obra.
// Mutaciones criticas (crear solicitud, registrar avance) se persisten
// localmente si no hay red y se reintentan al volver online.

const DB_NAME = 'nominapp-offline'
const DB_VERSION = 1
const STORE = 'mutations'

export type MutationKind = 'requisition.create' | 'partida_progress.add' | 'inventory_movement.add'

export interface QueuedMutation<TPayload = unknown> {
  id: string
  kind: MutationKind
  payload: TPayload
  created_at: string
  retry_count: number
  last_error?: string | null
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    Promise.resolve(fn(store))
      .then((value) => {
        transaction.oncomplete = () => resolve(value)
        transaction.onerror = () => reject(transaction.error)
      })
      .catch(reject)
  })
}

function genId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const offlineQueue = {
  isSupported(): boolean {
    return typeof indexedDB !== 'undefined'
  },

  async enqueue<TPayload>(kind: MutationKind, payload: TPayload): Promise<string> {
    if (!this.isSupported()) throw new Error('IndexedDB no soportado')
    const item: QueuedMutation<TPayload> = {
      id: genId(),
      kind,
      payload,
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
    }
    await tx('readwrite', (store) => store.put(item))
    return item.id
  },

  async list(): Promise<QueuedMutation[]> {
    if (!this.isSupported()) return []
    return tx('readonly', (store) => {
      return new Promise<QueuedMutation[]>((resolve, reject) => {
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result ?? []) as QueuedMutation[])
        req.onerror = () => reject(req.error)
      })
    })
  },

  async remove(id: string): Promise<void> {
    if (!this.isSupported()) return
    await tx('readwrite', (store) => store.delete(id))
  },

  async markFailure(id: string, error: string): Promise<void> {
    if (!this.isSupported()) return
    await tx('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const req = store.get(id)
        req.onsuccess = () => {
          const item = req.result as QueuedMutation | undefined
          if (!item) return resolve()
          item.retry_count += 1
          item.last_error = error
          const put = store.put(item)
          put.onsuccess = () => resolve()
          put.onerror = () => reject(put.error)
        }
        req.onerror = () => reject(req.error)
      })
    })
  },

  async clear(): Promise<void> {
    if (!this.isSupported()) return
    await tx('readwrite', (store) => store.clear())
  },
}

// Procesador genérico: el caller registra los handlers por kind.
export type MutationHandler = (payload: unknown) => Promise<void>

/** Máximo de intentos antes de descartar un item de la cola. */
const MAX_RETRIES = 5

export class OfflineQueueProcessor {
  private handlers = new Map<MutationKind, MutationHandler>()
  private running = false

  register(kind: MutationKind, handler: MutationHandler): this {
    this.handlers.set(kind, handler)
    return this
  }

  async flush(): Promise<{ processed: number; failed: number }> {
    if (this.running) return { processed: 0, failed: 0 }
    this.running = true
    try {
      const items = await offlineQueue.list()
      let processed = 0
      let failed = 0
      for (const item of items) {
        // Descartar items que ya agotaron su presupuesto de reintentos.
        if (item.retry_count >= MAX_RETRIES) {
          await offlineQueue.remove(item.id)
          failed += 1
          continue
        }
        const handler = this.handlers.get(item.kind)
        if (!handler) continue
        try {
          await handler(item.payload)
          await offlineQueue.remove(item.id)
          processed += 1
        } catch (e) {
          failed += 1
          await offlineQueue.markFailure(item.id, (e as Error).message ?? 'unknown')
        }
      }
      return { processed, failed }
    } finally {
      this.running = false
    }
  }
}

// Helper: detectar offline.
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}
