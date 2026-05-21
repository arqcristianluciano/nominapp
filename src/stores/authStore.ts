import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/react'
import { authenticate, signOut, type AuthUser } from '@/services/authService'

interface AuthState {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
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
    }),
    {
      name: 'nominaapp-auth',
      partialize: (s) => ({ user: s.user }),
    },
  ),
)
