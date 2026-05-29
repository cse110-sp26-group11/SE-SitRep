import { routeRequest } from './router.js'
import { errorResponse } from './lib/responses.js'

export default {
  async fetch(request, env) {
    try {
      if (!env.DB) {
        return errorResponse('D1 binding DB is not configured', 500)
      }

      return await routeRequest(request, env)
    } catch (error) {
      console.error(error)
      return errorResponse('Internal server error', 500)
    }
  }
}
