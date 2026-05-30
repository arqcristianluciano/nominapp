import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',
    testTimeout: 10000,
    coverage: {
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/types/database.generated.ts',
        'node_modules/**',
        'dist/**',
        'e2e/**',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
      ],
    },
  },
})
