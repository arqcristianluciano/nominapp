import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/react'
import { authenticate, signOut, getCurrentAuthUser, type AuthUser } from '@/services/authService'
import { useProjectStore } from '@/stores/projectStore'
import { usePayrollStore } from '@/stores/payrollStore'
import { supabase, isDemoMode } from '@/lib/supabase'

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
        // Vaciar los datos en memoria del usuario anterior (proyectos y
        // nóminas) para que el siguiente que entre en el mismo aparato arranque
        // limpio y no vea de reojo lo del anterior.
        useProjectStore.getState().reset()
        usePayrollStore.getState().reset()
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

/**
 * Vigila la sesión real con el servidor. La app recuerda al usuario en el
 * navegador por su cuenta; si la sesión real muere (por ejemplo, tras semanas
 * sin abrir la app, o si un administrador cambia la contraseña), antes la app
 * seguía "conectada" pero todas las consultas fallaban y se veían pantallas
 * vacías, sin avisar. Ahora, al morir la sesión, se borra el usuario guardado
 * y RequireAuth lo lleva solo a la pantalla de entrada.
 *
 * En modo demo no hay sesión real (mockSupabase no tiene `auth`), así que no se
 * suscribe nada.
 */
if (!isDemoMode) {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    const { user } = useAuthStore.getState()
    if (!user) return
    Sentry.setUser(null)
    useAuthStore.setState({ user: null })
    useProjectStore.getState().reset()
    usePayrollStore.getState().reset()
  })
}
