export function jsonResponse (body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  })
}

export function errorResponse (message, status = 500) {
  return jsonResponse({ error: message }, status)
}

export function validationError (message) {
  return errorResponse(message, 400)
}
