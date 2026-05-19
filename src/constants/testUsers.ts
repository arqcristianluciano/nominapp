// Cuentas provisionales de prueba creadas en producción para testear los
// 8 roles del estado deseado. ELIMINAR antes de salir a producción real:
//   1. Borrar las filas de auth.users con email LIKE '%@nominapp.local'.
//   2. Quitar este archivo / el componente LoginQuickAccess del bundle.

export interface TestUser {
  email: string
  password: string
  displayName: string
  roleLabel: string
}

export const TEST_USERS: TestUser[] = [
  {
    email: 'admin@nominapp.local',
    password: 'Admin2026!Strong',
    displayName: 'Administrador',
    roleLabel: 'Director General',
  },
  {
    email: 'gerente@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Gerente',
    roleLabel: 'Gerente de Proyecto',
  },
  {
    email: 'planificacion@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Planificación',
    roleLabel: 'Planificación',
  },
  {
    email: 'obra@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Ing. de Obra',
    roleLabel: 'Ingeniero de Obra',
  },
  {
    email: 'supervisor@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Supervisor',
    roleLabel: 'Supervisor especializado',
  },
  {
    email: 'comprador@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Comprador',
    roleLabel: 'Comprador',
  },
  {
    email: 'almacen@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Almacenista',
    roleLabel: 'Almacenista',
  },
  {
    email: 'contabilidad@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Contabilidad',
    roleLabel: 'Contabilidad (read)',
  },
]
