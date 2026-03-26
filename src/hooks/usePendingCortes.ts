import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePendingCortes() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  async function refresh() {
    const { data } = await supabase
      .from('contract_cortes')
      .select('id')
      .eq('status', 'approved')
    setCount(data?.length ?? 0)
  }

  return count
}
