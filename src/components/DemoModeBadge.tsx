import { isDemoMode } from '@/lib/supabase'

/**
 * Muestra una etiqueta fija "MODO DEMO" cuando la app corre con datos de
 * ejemplo (sin base de datos real configurada). Sirve de red de seguridad: si
 * algún día se publica la app real sin su configuración, se caería a modo demo
 * con datos falsos; esta etiqueta lo hace evidente al instante en vez de que
 * pase desapercibido. En la app real (con base de datos) no se muestra nada.
 */
export function DemoModeBadge() {
  if (!isDemoMode) return null
  return (
    <div
      className="fixed bottom-2 left-2 z-[60] pointer-events-none select-none rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md"
      role="status"
      aria-label="Modo demostración con datos de ejemplo"
    >
      Modo demo · datos de ejemplo
    </div>
  )
}
