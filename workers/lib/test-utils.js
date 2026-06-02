import { vi } from 'vitest'

/**
 * Builds a mock D1 database binding for handler unit tests.
 * @param {Array<object>} handlers Query handlers keyed by SQL match and method.
 * @returns {{DB: object, queries: Array<object>}} Mock env pieces.
 */
export function createMockD1 (handlers = []) {
  const queries = []

  return {
    queries,
    DB: {
      prepare (sql) {
        const query = {
          sql,
          bindings: [],
          method: null
        }
        queries.push(query)

        const statement = {
          bind (...bindings) {
            query.bindings = bindings
            return statement
          },
          async first () {
            query.method = 'first'
            return resolveD1Result(handlers, query, 'first')
          },
          async all () {
            query.method = 'all'
            return resolveD1Result(handlers, query, 'all')
          },
          async run () {
            query.method = 'run'
            return resolveD1Result(handlers, query, 'run')
          }
        }

        return statement
      }
    }
  }
}

/**
 * Reads a JSON response body in tests.
 * @param {Response} response Fetch Response object.
 * @returns {Promise<object>} Parsed JSON body.
 */
export async function readJsonResponse (response) {
  return response.json()
}

/**
 * Creates a JSON request for handler tests.
 * @param {string} url Request URL.
 * @param {object} body JSON body.
 * @param {string} method HTTP method.
 * @returns {Request} Request object.
 */
export function jsonRequest (url, body, method = 'POST') {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

/**
 * Installs a deterministic crypto.randomUUID mock.
 * @param {string} value UUID value to return.
 * @returns {import('vitest').MockInstance} Vitest spy.
 */
export function mockRandomUUID (value) {
  return vi.spyOn(crypto, 'randomUUID').mockReturnValue(value)
}

/**
 * Finds a handler for one mock D1 query.
 * @param {Array<object>} handlers Query handlers.
 * @param {object} query Query details.
 * @param {string} method D1 result method.
 * @returns {Promise<object|undefined>} Mocked result.
 */
async function resolveD1Result (handlers, query, method) {
  const handler = handlers.find(candidate => {
    const methodMatches = !candidate.method || candidate.method === method
    const sqlMatches = typeof candidate.match === 'function'
      ? candidate.match(query.sql)
      : candidate.match.test(query.sql)

    return methodMatches && sqlMatches
  })

  if (!handler) {
    return defaultD1Result(method)
  }

  if (typeof handler.result === 'function') {
    return handler.result(query)
  }

  return handler.result
}

/**
 * Returns a D1-shaped default for unmatched queries.
 * @param {string} method D1 result method.
 * @returns {object|undefined} Default result.
 */
function defaultD1Result (method) {
  if (method === 'all') return { results: [] }
  if (method === 'run') return { success: true }
  return undefined
}
