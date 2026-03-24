import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-app-border bg-app-bg/80 text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
      <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">
        {isDark ? 'Claro' : 'Oscuro'}
      </span>
    </button>
  )
}
