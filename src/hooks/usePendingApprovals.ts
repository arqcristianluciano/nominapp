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
        .or('status.eq.pending_approval,status.eq.needs_revision')
      if (cancelled) return
      if (error) {
        console.error('usePendingApprovals fetch failed', error)
        return
      }
      setCount(data?.length ?? 0)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return count
}
