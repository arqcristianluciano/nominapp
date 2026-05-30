import { MoveHorizontal } from 'lucide-react'

/**
 * Pista, solo en móvil, de que una tabla ancha se desplaza horizontalmente.
 * Se coloca dentro del contenedor con borde, justo antes del bloque
 * `overflow-x-auto`, para las tablas densas de captura que no se convierten
 * a tarjetas.
 */
export function TableScrollHint() {
  return (
    <p className="sm:hidden flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-app-subtle border-b border-app-border bg-app-bg">
      <MoveHorizontal className="w-3.5 h-3.5 shrink-0" />
      Desliza para ver toda la tabla
    </p>
  )
}
