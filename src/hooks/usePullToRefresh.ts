import { useEffect, useRef, useState, type RefObject } from 'react'

const THRESHOLD = 70 // px de arrastre para disparar el refresco
const MAX_PULL = 110 // arrastre máximo visible (con resistencia)

/**
 * Pull-to-refresh para un contenedor con scroll propio (p. ej. el `<main>`).
 * Sólo se activa en pantallas táctiles y cuando el scroll está arriba del todo.
 * `onRefresh` se invoca al soltar tras superar el umbral.
 */
export function usePullToRefresh(scrollRef: RefObject<HTMLElement | null>, onRefresh: () => void | Promise<void>) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const state = useRef({ startY: null as number | null, active: false, pull: 0, refreshing: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof window === 'undefined') return
    if (!window.matchMedia('(pointer: coarse)').matches) return

    const s = state.current

    const onStart = (e: TouchEvent) => {
      if (s.refreshing) return
      if (el.scrollTop <= 0 && e.touches.length === 1) {
        s.startY = e.touches[0].clientY
        s.active = true
      } else {
        s.active = false
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!s.active || s.startY == null || s.refreshing) return
      const delta = e.touches[0].clientY - s.startY
      if (delta <= 0) {
        s.pull = 0
        setPull(0)
        return
      }
      const dist = Math.min(MAX_PULL, delta * 0.5)
      s.pull = dist
      setPull(dist)
    }

    const onEnd = async () => {
      if (!s.active) return
      s.active = false
      s.startY = null
      const reached = s.pull >= THRESHOLD
      if (reached && !s.refreshing) {
        s.refreshing = true
        s.pull = THRESHOLD
        setRefreshing(true)
        setPull(THRESHOLD)
        try {
          await onRefreshRef.current()
        } finally {
          s.refreshing = false
          s.pull = 0
          setRefreshing(false)
          setPull(0)
        }
      } else {
        s.pull = 0
        setPull(0)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [scrollRef])

  return { pull, refreshing, threshold: THRESHOLD }
}
