/**
 * Credenciales demo en cliente. Sustituir por Supabase Auth en producción.
 * `isDirector` permite explorar las rutas protegidas por RequireDirector
 * (p. ej. /director) en modo demo.
 */
export const DEMO_USERS = [
  { username: 'cristian', password: 'cristian123', displayName: 'Cristian', isDirector: true },
  { username: 'roni', password: 'roni123', displayName: 'Roni', isDirector: false },
] as const
