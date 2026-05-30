// SOLO DEV. ELIMINAR antes de salir a produccion oficial.
// Cuentas provisionales de prueba creadas en producción para testear los
// 8 roles del estado deseado. ELIMINAR antes de salir a producción real:
//   1. Borrar las filas de auth.users con email LIKE '%@nominapp.local'.
//   2. Quitar este archivo / el componente LoginQuickAccess del bundle.

// ⚠️ TEMPORAL — acceso rápido de pruebas en la pantalla de login.
// Controlado por la variable de entorno `VITE_ENABLE_TEST_LOGIN`: solo cuando
// vale exactamente 'true' se muestran los botones de "entrar como <rol>" en una
// build de producción real. Por defecto (sin la variable) queda DESACTIVADO en
// producción, de modo que nadie con la URL pueda entrar como cualquier rol
// (incluido Director General). En modo demo (mockSupabase) y en build de
// desarrollo el acceso rápido sigue disponible aunque la variable no esté.
export const ENABLE_TEST_QUICK_LOGIN = import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'

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
    email: 'director@nominapp.local',
    password: 'Demo2026!',
    displayName: 'Director',
    roleLabel: 'Director de Proyecto',
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
