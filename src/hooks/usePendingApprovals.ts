import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingApprovals() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      const { data, error } = await supabase
        .from('purchase_requisitions')
        .select('id')
        .or('status.eq.pending_approval,status.eq.needs_revision,status.eq.pendiente_liberacion')
      if (cancelled) return
      if (error) {
        console.error('usePendingApprovals fetch failed', error)
        return
      }
      setCount(data?.length ?? 0)
    }

    void fetchCount()

    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_requisitions',
          filter: 'status=in.(pending_approval,needs_revision,pendiente_liberacion)',
        },
        () => void fetchCount(),
      )
      .subscribe()

    // Fallback polling in case Realtime fails to connect
    const interval = setInterval(fetchCount, 120_000)

    return () => {
      cancelled = true
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
