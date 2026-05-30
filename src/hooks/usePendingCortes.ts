import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingCortes() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      const { data, error } = await supabase.from('contract_cortes').select('id').eq('status', 'approved')
      if (cancelled) return
      if (error) {
        console.error('usePendingCortes fetch failed', error)
        return
      }
      setCount(data?.length ?? 0)
    }

    void fetchCount()

    const channel = supabase
      .channel('pending-cortes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_cortes',
          filter: 'status=eq.approved',
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
