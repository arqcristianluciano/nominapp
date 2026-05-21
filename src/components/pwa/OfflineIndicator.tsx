import { useEffect, useState } from 'react'

const RECONNECTED_DURATION_MS = 3000

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!showReconnected) return
    const timeoutId = window.setTimeout(() => {
      setShowReconnected(false)
    }, RECONNECTED_DURATION_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showReconnected])

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="assertive"
        className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
      >
        Sin conexion
      </div>
    )
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-50 bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
      >
        Conectado
      </div>
    )
  }

  return null
}
