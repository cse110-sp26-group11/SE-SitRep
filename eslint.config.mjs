// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc'
import standard from 'eslint-config-standard'
import jsdoc from 'eslint-plugin-jsdoc'

const compat = new FlatCompat()

export default [
  ...compat.config(standard),
  jsdoc.configs['flat/recommended'],
  {
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: true,
          ClassDeclaration: true,
          MethodDefinition: true
        }
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/valid-types': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-description': 'warn'
    }
  },
  {
    ignores: ['node_modules/']
  }
]
