import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function RequireDirector() {
  const user = useAuthStore((s) => s.user)
  if (!user?.isDirector) return <Navigate to="/" replace />
  return <Outlet />
}
