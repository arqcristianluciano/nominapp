import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useThemeStore, syncThemeFromStore } from '@/stores/themeStore'

useThemeStore.persist.onFinishHydration(() => {
  syncThemeFromStore()
})
if (useThemeStore.persist.hasHydrated()) {
  syncThemeFromStore()
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* SW registration is optional */})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
