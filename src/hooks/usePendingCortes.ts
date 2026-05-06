import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingCortes() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      const { data, error } = await supabase
        .from('contract_cortes')
        .select('id')
        .eq('status', 'approved')
      if (cancelled) return
      if (error) {
        console.error('usePendingCortes fetch failed', error)
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
