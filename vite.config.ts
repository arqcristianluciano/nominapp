import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// TODO(observability): para release tracking y subida de source maps a Sentry
// agregar `@sentry/vite-plugin` aquí. Requiere `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`
// y `SENTRY_PROJECT` configurados en el entorno de CI/Vercel.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
})
