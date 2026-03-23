import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingApprovals() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function refresh() {
    const { data } = await supabase
      .from('purchase_requisitions')
      .select('id')
      .or('status.eq.pending_approval,status.eq.needs_revision')
    setCount(data?.length ?? 0)
  }

  return count
}
