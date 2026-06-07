import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/react'
import { authenticate, signOut, getCurrentAuthUser, type AuthUser } from '@/services/authService'

interface AuthState {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  /**
   * Vuelve a leer el perfil del usuario actual desde la base de datos y
   * actualiza el store. Útil después de cambios de rol o permisos para que
   * el usuario no tenga que cerrar y volver a abrir sesión.
   */
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (username, password) => {
        const next = await authenticate(username, password)
        if (!next) return false
        set({ user: next })
        Sentry.setUser({ id: next.id, username: next.username })
        return true
      },
      logout: async () => {
        Sentry.setUser(null)
        await signOut()
        set({ user: null })
      },
      setUser: (user) => set({ user }),
      refreshUser: async () => {
        const fresh = await getCurrentAuthUser()
        if (fresh) {
          set({ user: fresh })
          Sentry.setUser({ id: fresh.id, username: fresh.username })
        }
      },
    }),
    {
      name: 'nominaapp-auth',
      partialize: (s) => ({ user: s.user }),
    },
  ),
)
