import { useCallback, useEffect, useState } from 'react'
import { OfflineQueueProcessor, isOnline, offlineQueue } from '@/utils/offlineQueue'
import { requisitionService } from '@/services/requisitionService'
import { partidaProgressService } from '@/services/partidaProgressService'
import { inventoryService } from '@/services/inventoryService'

// Procesador singleton: registra handlers para los kinds soportados.
const processor = new OfflineQueueProcessor()
  .register('requisition.create', async (payload) => {
    await requisitionService.create(payload as Parameters<typeof requisitionService.create>[0])
  })
  .register('partida_progress.add', async (payload) => {
    await partidaProgressService.addProgress(payload as Parameters<typeof partidaProgressService.addProgress>[0])
  })
  .register('inventory_movement.add', async (payload) => {
    await inventoryService.addMovement(payload as Parameters<typeof inventoryService.addMovement>[0])
  })

export function useOfflineQueue() {
  const [online, setOnline] = useState<boolean>(isOnline())
  const [pendingCount, setPendingCount] = useState<number>(0)

  const refreshCount = useCallback(async () => {
    try {
      const list = await offlineQueue.list()
      setPendingCount(list.length)
    } catch {
      // IndexedDB no soportado o bloqueado; ignorar silenciosamente.
    }
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true)
      const result = await processor.flush()
      if (result.processed + result.failed > 0) await refreshCount()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // refreshCount es async; el setState ocurre dentro del .then, no en el body del effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshCount])

  const flushNow = useCallback(async () => {
    const result = await processor.flush()
    await refreshCount()
    return result
  }, [refreshCount])

  return { online, pendingCount, flushNow, refresh: refreshCount }
}
