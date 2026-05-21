import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esTranslations from './locales/es.json'
import enTranslations from './locales/en.json'

const STORAGE_KEY = 'nominapp:language'
const FALLBACK_LANG = 'es-DO'
const SUPPORTED_LANGS = ['es', 'es-DO', 'en'] as const

function detectInitialLanguage(): string {
  // 1. localStorage persistence has highest priority
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (stored && SUPPORTED_LANGS.includes(stored as typeof SUPPORTED_LANGS[number])) {
      return stored
    }
  } catch {
    // ignore storage errors (e.g. private mode / SSR)
  }

  // 2. Browser language detection
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || (navigator.languages && navigator.languages[0])
    if (browserLang) {
      if (browserLang.toLowerCase().startsWith('en')) return 'en'
      if (browserLang.toLowerCase().startsWith('es')) {
        return browserLang.toLowerCase() === 'es-do' ? 'es-DO' : 'es'
      }
    }
  }

  // 3. Fallback
  return FALLBACK_LANG
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: esTranslations },
    'es-DO': { translation: esTranslations },
    en: { translation: enTranslations },
  },
  lng: detectInitialLanguage(),
  fallbackLng: FALLBACK_LANG,
  supportedLngs: SUPPORTED_LANGS as unknown as string[],
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false, // React already escapes by default
  },
  returnNull: false,
})

// Persist language preference in localStorage on change
i18n.on('languageChanged', (lng) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lng)
    }
  } catch {
    // ignore storage errors
  }
})

export default i18n
export { STORAGE_KEY as I18N_STORAGE_KEY }
