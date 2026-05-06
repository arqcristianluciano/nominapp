import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingApprovals() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('id')
      .or('status.eq.pending_approval,status.eq.needs_revision')
    if (error) {
      console.error('usePendingApprovals refresh failed', error)
      return
    }
    setCount(data?.length ?? 0)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  return count
}
