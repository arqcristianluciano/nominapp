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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
