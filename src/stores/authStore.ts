import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authenticate, type AuthUser } from '@/services/authService'

interface AuthState {
  user: AuthUser | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username, password) => {
        const next = authenticate(username, password)
        if (!next) return false
        set({ user: next })
        return true
      },
      logout: () => set({ user: null }),
    }),
    {
      name: 'nominaapp-auth',
      partialize: (s) => ({ user: s.user }),
    },
  ),
)
