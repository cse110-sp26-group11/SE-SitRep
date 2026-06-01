// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc'
import standard from 'eslint-config-standard'
import jsdoc from 'eslint-plugin-jsdoc'

const compat = new FlatCompat()

export default [
  {
    ignores: [
      'node_modules/',
      '.wrangler/',
      'coverage/',
      'dist/'
    ]
  },
  ...compat.config(standard),
  jsdoc.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        Headers: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        localStorage: 'readonly',
        window: 'readonly'
      }
    },
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/valid-types': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-description': 'off'
    }
  }
]
