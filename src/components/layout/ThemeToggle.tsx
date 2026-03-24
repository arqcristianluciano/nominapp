import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

type Props = {
  /** Si true, muestra siempre el texto (p. ej. en sidebar móvil). */
  showLabelAlways?: boolean
}

export function ThemeToggle({ showLabelAlways = false }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const isDark = theme === 'dark'
  const labelClass = showLabelAlways ? 'inline' : 'hidden sm:inline'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-app-border bg-app-bg/80 text-app-muted hover:text-app-text hover:bg-app-hover transition-colors w-full sm:w-auto justify-center sm:justify-start"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
      <span className={`${labelClass} text-xs font-medium whitespace-nowrap`}>
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </span>
    </button>
  )
}
