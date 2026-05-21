import { useEffect, useRef, useState } from 'react'
import { Languages, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LanguageOption {
  code: string
  label: string
  short: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
]

function normalizeCode(lang: string): string {
  if (lang.toLowerCase().startsWith('en')) return 'en'
  return 'es'
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const currentCode = normalizeCode(i18n.language || 'es')
  const current = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSelect(code: string) {
    await i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
        title={`Idioma: ${current.label}`}
        aria-label="Cambiar idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="w-4 h-4" />
        <span className="text-xs font-semibold">{current.short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1 w-36 bg-app-surface border border-app-border rounded-xl shadow-md py-1 z-50"
        >
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === currentCode
            return (
              <li key={lang.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-app-hover transition-colors ${
                    isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-app-text'
                  }`}
                >
                  <span>{lang.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
