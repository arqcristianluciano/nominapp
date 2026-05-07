import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = 'obrapro:chunk-reload-attempt'

/**
 * Detecta errores típicos de "stale chunk": cuando el browser tiene un
 * index.html viejo apuntando a un asset hashed que ya no existe en el deploy
 * actual (Vite + SPA fallback en Vercel devuelve index.html con MIME text/html).
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Unable to preload CSS') ||
    /Loading (chunk|CSS chunk) [\w-]+ failed/.test(message)
  )
}

export function clearChunkReloadFlag(): void {
  try {
    window.sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // sessionStorage puede no estar disponible (modo privado, SSR)
  }
}

function hasAlreadyReloaded(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_KEY) === '1'
  } catch {
    return false
  }
}

function markReloaded(): void {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    // ignore
  }
}

/**
 * Reemplazo de React.lazy() que, si el import dinámico falla por un chunk
 * obsoleto tras un nuevo deploy, fuerza una recarga de la página (una sola vez
 * por sesión para evitar loops). Si la recarga ya se intentó, propaga el error
 * original para que lo maneje el ErrorBoundary del router.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      clearChunkReloadFlag()
      return mod
    } catch (error) {
      if (isChunkLoadError(error) && !hasAlreadyReloaded()) {
        markReloaded()
        window.location.reload()
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}
