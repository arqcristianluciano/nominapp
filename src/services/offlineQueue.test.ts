import { describe, expect, it } from 'vitest'

// `fake-indexeddb` is NOT in package.json (per task constraints we can't add
// new dependencies), and the vitest environment is `node`, where the global
// `indexedDB` is undefined. Skip the integration test until the dependency
// (or the `happy-dom`/`jsdom` environment) is available.
//
// When `fake-indexeddb` is installed, replace `.skip` with the real suite:
//
//   import 'fake-indexeddb/auto'
//   import { enqueue, peekAll, processQueue } from './offlineQueue'
//
//   beforeEach(() => { indexedDB = new IDBFactory() })
//
// The happy-path coverage below is the contract we want to lock in.

describe.skip('offlineQueue (requires fake-indexeddb)', () => {
  it('enqueue -> peekAll -> processQueue happy path', async () => {
    const { enqueue, peekAll, processQueue } = await import('./offlineQueue')

    const id = await enqueue('attendance.checkin', { userId: 'u1', at: 1234 })
    expect(typeof id).toBe('string')

    const pending = await peekAll()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      id,
      type: 'attendance.checkin',
      retries: 0,
    })

    const calls: unknown[] = []
    const result = await processQueue({
      'attendance.checkin': async (payload) => {
        calls.push(payload)
      },
    })

    expect(result).toEqual({ processed: 1, failed: 0 })
    expect(calls).toEqual([{ userId: 'u1', at: 1234 }])
    expect(await peekAll()).toHaveLength(0)
  })
})
