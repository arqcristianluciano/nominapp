import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Prevent "silent failures": a catch block whose only action is to log to
      // the console swallows the error without telling the user. Surface it
      // (toast/notification) in addition to (or instead of) logging.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CatchClause > BlockStatement[body.length=1] > ExpressionStatement > CallExpression[callee.object.name='console']",
          message:
            'No silencies errores: un catch cuyo único cuerpo es console.* oculta el fallo al usuario. Muestra un toast/feedback además de loguear.',
        },
      ],
    },
  },
])
