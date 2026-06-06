import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const MIGRATIONS_DIR = join(REPO_ROOT, 'd1', 'migrations')
const SEED_FILE = join(REPO_ROOT, 'd1', 'seeds', 'demo.sql')

/**
 * Creates an isolated Miniflare D1 environment loaded with schema and seed data.
 * @param {{seed?: boolean}} options Test setup options.
 * @returns {Promise<{env: {DB: object}, DB: object, dispose: Function}>} Test env.
 */
export async function createIntegrationEnv ({ seed = true } = {}) {
  const miniflare = new Miniflare({
    modules: true,
    script: 'export default { fetch () { return new Response("ok") } }',
    d1Databases: {
      DB: `integration-${crypto.randomUUID()}`
    }
  })

  const DB = await miniflare.getD1Database('DB')
  await applyMigrations(DB)

  if (seed) {
    await executeSql(DB, await readFile(SEED_FILE, 'utf8'))
  }

  return {
    env: { DB },
    DB,
    dispose: () => miniflare.dispose()
  }
}

/**
 * Creates an authenticated API request body.
 * @param {string} url API URL.
 * @param {object} body JSON request body.
 * @param {string} userId Authenticated user id.
 * @param {string} method HTTP method.
 * @returns {Request} JSON request with bearer session token.
 */
export function authenticatedJsonRequest (url, body, userId, method = 'POST') {
  return new Request(url, {
    method,
    headers: {
      authorization: `Bearer ${createSessionToken(userId)}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

/**
 * Reads a JSON response body in integration tests.
 * @param {Response} response Fetch response.
 * @returns {Promise<object>} Parsed JSON payload.
 */
export async function readJson (response) {
  return response.json()
}

async function applyMigrations (DB) {
  const migrationFiles = (await readdir(MIGRATIONS_DIR))
    .filter(file => file.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    await executeSql(DB, await readFile(join(MIGRATIONS_DIR, file), 'utf8'))
  }
}

async function executeSql (DB, sql) {
  const statements = sql
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement && !statement.startsWith('PRAGMA foreign_keys'))

  for (const statement of statements) {
    await DB.prepare(statement).run()
  }
}

function createSessionToken (userId) {
  return Buffer.from(JSON.stringify({ userId })).toString('base64')
}
