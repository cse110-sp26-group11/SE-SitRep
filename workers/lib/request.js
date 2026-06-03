export function getQueryParam (url, name, fallback) {
  const value = url.searchParams.get(name)
  return value && value.trim() ? value.trim() : fallback
}

export function getPathParts (url) {
  return url.pathname.split('/').filter(Boolean)
}

export async function readJson (request) {
  try {
    return await request.json()
  } catch {
    throw new Error('Request body must be valid JSON')
  }
}

function decodeSessionToken (token) {
  if (!token) return null

  try {
    const session = JSON.parse(atob(token))
    return typeof session?.userId === 'string' && session.userId.trim()
      ? session
      : null
  } catch {
    return null
  }
}

export function getAuthenticatedSession (request) {
  const authorization = request.headers.get('authorization') || ''
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
  const fallbackToken = request.headers.get('x-session-token') || ''
  return decodeSessionToken(bearerToken || fallbackToken)
}
