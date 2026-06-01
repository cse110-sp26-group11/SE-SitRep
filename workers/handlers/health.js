import { jsonResponse } from '../lib/responses.js'

export async function handleHealth (env) {
  await env.DB.prepare('SELECT 1 AS ok').first()

  return jsonResponse({
    status: 'ok',
    service: 'se-sitrep-api',
    database: 'reachable'
  })
}
