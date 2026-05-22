import { jsdoc } from 'eslint-plugin-jsdoc'
import neostandard from 'neostandard'

export default [
    ...neostandard(),
    jsdoc({
        config: 'flat/recommended',
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
  }),
  {
    ignores: ['node_modules/']
  }
]