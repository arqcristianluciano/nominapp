import { Navigate, Outlet } from 'react-router-dom'
import { useAppRoles, type UseAppRolesResult } from '@/hooks/useAppRoles'

/**
 * Gate de ruta basado en una capacidad app-wide (useAppRoles).
 * Si el flag es false redirige al home. Usar para rutas como
 * /reportes, /historial-precios, /aprobaciones (solo DG) o /prestamos.
 */
type CapabilityKey = {
  [K in keyof UseAppRolesResult]: UseAppRolesResult[K] extends boolean ? K : never
}[keyof UseAppRolesResult]

export function RequireAppCapability({ capability }: { capability: CapabilityKey }) {
  const app = useAppRoles()
  if (app.loading) return <div className="p-6 text-sm text-app-muted">Cargando...</div>
  if (!app[capability]) return <Navigate to="/" replace />
  return <Outlet />
}
