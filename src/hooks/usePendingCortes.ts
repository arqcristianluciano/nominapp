import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingCortes() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('contract_cortes')
      .select('id')
      .eq('status', 'approved')
    if (error) {
      console.error('usePendingCortes refresh failed', error)
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
