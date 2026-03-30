import { Link, useLocation } from 'react-router-dom'
import { Home, ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* Illustration */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/60 dark:to-indigo-950/60 flex items-center justify-center">
            <SearchX className="w-14 h-14 text-blue-400 dark:text-blue-500" />
          </div>
          <span className="absolute -top-2 -right-2 text-5xl font-black text-blue-600/20 dark:text-blue-400/20 select-none">
            404
          </span>
        </div>

        <h1 className="text-3xl font-black text-app-text mb-2">Página no encontrada</h1>
        <p className="text-sm text-app-muted mb-2">
          La ruta <code className="font-mono text-xs bg-app-chip px-1.5 py-0.5 rounded border border-app-border">
            {location.pathname}
          </code> no existe.
        </p>
        <p className="text-sm text-app-muted mb-8">
          Puede que el enlace esté roto o que la página haya sido movida.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 border border-app-border rounded-xl text-sm font-semibold text-app-muted hover:bg-app-hover hover:text-app-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
