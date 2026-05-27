import { jsdoc } from 'eslint-plugin-jsdoc'
import neostandard from 'neostandard'

export default [
  ...neostandard(),
  jsdoc({
    config: 'flat/recommended',
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/valid-types': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/check-param-names': 'error'
    }
  }),
  {
    ignores: ['node_modules/']
  }
]
