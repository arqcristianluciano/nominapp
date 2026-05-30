import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// El release de la subida de source maps debe coincidir con el que reporta el
// runtime (src/main.tsx via VITE_SENTRY_RELEASE); si no, los stack traces no se
// des-minifican. Lo derivamos del commit SHA del deploy y lo escribimos en
// process.env para que Vite lo exponga como import.meta.env.VITE_SENTRY_RELEASE.
const release = process.env.VITE_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
process.env.VITE_SENTRY_RELEASE = release

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryEnabled = Boolean(sentryAuthToken && sentryOrg && sentryProject)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuthToken,
            ...(release ? { release: { name: release } } : {}),
            // La subida de source maps no debe tumbar el build: si Sentry falla
            // (token vencido, cuota, red), avisamos y seguimos. Los mapas se
            // suben igual cuando Sentry responde bien.
            errorHandler: (err) => {
              console.warn('[sentry-vite-plugin] subida de source maps fallida (no bloqueante):', err)
            },
          }),
        ]
      : []),
  ],
  build: {
    sourcemap: 'hidden',
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
