// Bandeja persistente de notificaciones in-app: guarda en localStorage las
// notificaciones generadas por notificationService para que no se pierdan
// al recargar la página o cerrar el browser.
//
// Cuando esté disponible Web Push real (Nivel 4), este store sigue siendo
// la fuente de verdad UI: el SW empuja → endpoint persiste aquí también.

import type { AppNotification, NotifLevel } from '@/services/notificationService'

export interface InboxEntry extends AppNotification {
  received_at: string
  read: boolean
}

const STORAGE_KEY = 'nominapp.notifications.inbox'
const MAX_ENTRIES = 200

function read(): InboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InboxEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries: InboxEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // localStorage lleno o bloqueado; ignorar silenciosamente.
  }
}

export const notificationsInbox = {
  list(): InboxEntry[] {
    return read()
  },

  unreadCount(): number {
    return read().filter((n) => !n.read).length
  },

  // Sincroniza el inbox con la lista actual del service.
  // Mantiene los registros previos como "ya recibidos"; añade los nuevos
  // como unread; ningún registro se borra automáticamente.
  syncFromService(current: AppNotification[]): InboxEntry[] {
    const previous = read()
    const byId = new Map(previous.map((p) => [p.id, p]))
    const now = new Date().toISOString()
    const merged: InboxEntry[] = []

    for (const notif of current) {
      const existing = byId.get(notif.id)
      if (existing) {
        merged.push(existing)
        byId.delete(notif.id)
      } else {
        merged.push({ ...notif, received_at: now, read: false })
      }
    }
    // Conserva las que ya no aparecen (e.g. CxP que se pagó) como "resueltas".
    for (const stale of byId.values()) {
      merged.push({ ...stale, read: true })
    }
    merged.sort((a, b) => b.received_at.localeCompare(a.received_at))
    write(merged)
    return merged
  },

  markAllRead(): InboxEntry[] {
    const updated = read().map((n) => ({ ...n, read: true }))
    write(updated)
    return updated
  },

  clear(): void {
    write([])
  },

  filterByLevel(level: NotifLevel): InboxEntry[] {
    return read().filter((n) => n.level === level)
  },
}
