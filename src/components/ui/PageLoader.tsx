/**
 * Fallback de carga a nivel de página para React.Suspense.
 * Se muestra mientras se descarga el código de cada pantalla (lazy).
 * Usa el mismo sistema de colores (app-*) y animación pulse del resto de la UI.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando pantalla"
      className="flex flex-col gap-4 p-6 animate-pulse"
    >
      {/* Título de página */}
      <div className="h-5 w-48 rounded bg-app-chip" />

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-app-surface border border-app-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-1/2 rounded bg-app-chip" />
            <div className="h-5 w-2/3 rounded bg-app-chip" />
          </div>
        ))}
      </div>

      {/* Tabla de contenido */}
      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 flex-1 rounded bg-app-chip" />
          ))}
        </div>
        <div className="divide-y divide-app-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 flex gap-4 items-center">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className={`h-3 rounded bg-app-chip flex-1 ${j === 1 ? 'max-w-[180px]' : ''}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Cargando contenido...</span>
    </div>
  )
}
