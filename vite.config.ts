import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN
const SENTRY_ORG = process.env.SENTRY_ORG
const SENTRY_PROJECT = process.env.SENTRY_PROJECT
const sentryEnabled = !!(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT)

export default defineConfig({
  build: {
    sourcemap: sentryEnabled,
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            authToken: SENTRY_AUTH_TOKEN,
            org: SENTRY_ORG,
            project: SENTRY_PROJECT,
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
